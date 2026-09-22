import { HeartPulse, Stethoscope, CalendarCheck2, UsersRound, Activity } from "lucide-react";

export function AuthVisual() {
  return <section className="auth-visual">
    <div className="clinical-logo"><span className="logo-symbol"><HeartPulse size={25} /></span><span>Central Clínica<small>Cuidado em cada conexão</small></span></div>
    <div className="auth-story"><span className="auth-eyebrow">FEITA PARA QUEM CUIDA</span><h2>Sua clínica conectada.<br /><em>Seu cuidado no centro.</em></h2><p>Organize pacientes, atendimentos e finanças em um lugar pensado para a sua rotina.</p>
      <div className="care-art" aria-hidden="true"><div className="care-orbit" /><div className="care-heart"><HeartPulse size={86} strokeWidth={1.1} /></div><span className="care-stethoscope"><Stethoscope size={62} strokeWidth={1.25} /></span><span className="care-float"><Activity size={20} /> Cuidado conectado</span></div>
      <div className="auth-features"><span><CalendarCheck2 size={20} /> Agenda organizada</span><span><UsersRound size={20} /> Pacientes por perto</span></div>
    </div><p className="auth-footnote">Tecnologia que aproxima. Gestão que simplifica.</p>
  </section>;
}
