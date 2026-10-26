export interface PortalButton {
  id: string;
  siraNo?: number;
  actionType?: 'link' | 'screen';
  groupId: 1 | 2;
  title: string;
  subtitle: string;
  category: string;
  iconName: string;
  gradient: {
    from: string;
    to: string;
    text: string;
    border: string;
    shadow: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
    iconBg: string;
  };
  customUrl?: string;
  description: string;
}

export interface ButtonGroup {
  id: 1 | 2;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
}

export type UserRole = 'admin' | 'personel' | 'misafir';

export interface AuthSession {
  username: string;
  role: UserRole;
  loginTime: string;
  matchedTable?: string;
}
