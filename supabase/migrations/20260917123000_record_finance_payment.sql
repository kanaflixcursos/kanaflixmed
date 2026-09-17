-- Records an idempotent payment and keeps the receivable status in sync.
create or replace function public.record_finance_payment(
  target_financial_entry uuid,
  payment_amount_cents bigint,
  payment_method public.payment_method,
  payment_idempotency_key text
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_row public.financial_entries;
  existing_payment public.payments;
  created_payment public.payments;
  paid_total bigint;
begin
  if payment_amount_cents <= 0 then
    raise exception 'PAYMENT_AMOUNT_INVALID';
  end if;

  if payment_idempotency_key is null or length(trim(payment_idempotency_key)) < 8 then
    raise exception 'PAYMENT_IDEMPOTENCY_KEY_INVALID';
  end if;

  select *
    into entry_row
    from public.financial_entries
   where id = target_financial_entry
   for update;

  if not found then
    raise exception 'FINANCIAL_ENTRY_NOT_FOUND';
  end if;

  if entry_row.type <> 'RECEIVABLE' then
    raise exception 'FINANCIAL_ENTRY_NOT_RECEIVABLE';
  end if;

  if not public.has_org_role(entry_row.organization_id, array['ADMIN', 'RECEPTION', 'FINANCE']::public.membership_role[]) then
    raise exception 'FINANCE_FORBIDDEN';
  end if;

  select *
    into existing_payment
    from public.payments
   where organization_id = entry_row.organization_id
     and idempotency_key = payment_idempotency_key;

  if found then
    if existing_payment.financial_entry_id <> target_financial_entry
       or existing_payment.amount_cents <> payment_amount_cents
       or existing_payment.method <> payment_method then
      raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT';
    end if;
    return existing_payment;
  end if;

  select coalesce(sum(amount_cents), 0)
    into paid_total
    from public.payments
   where financial_entry_id = target_financial_entry
     and reversed_payment_id is null;

  if payment_amount_cents > entry_row.amount_cents - paid_total then
    raise exception 'PAYMENT_EXCEEDS_BALANCE';
  end if;

  insert into public.payments (
    organization_id,
    financial_entry_id,
    amount_cents,
    method,
    idempotency_key,
    recorded_by
  ) values (
    entry_row.organization_id,
    target_financial_entry,
    payment_amount_cents,
    payment_method,
    payment_idempotency_key,
    auth.uid()
  )
  returning * into created_payment;

  paid_total := paid_total + payment_amount_cents;

  update public.financial_entries
     set status = case
       when paid_total >= amount_cents then 'PAID'::public.financial_entry_status
       when paid_total > 0 then 'PARTIAL'::public.financial_entry_status
       else 'PENDING'::public.financial_entry_status
     end
   where id = target_financial_entry;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) values (
    entry_row.organization_id,
    auth.uid(),
    'FINANCE_PAYMENT_RECORDED',
    'PAYMENT',
    created_payment.id,
    jsonb_build_object(
      'financial_entry_id', target_financial_entry,
      'amount_cents', payment_amount_cents,
      'method', payment_method,
      'financial_entry_status', case
        when paid_total >= entry_row.amount_cents then 'PAID'
        when paid_total > 0 then 'PARTIAL'
        else 'PENDING'
      end
    )
  );

  return created_payment;
end;
$$;
