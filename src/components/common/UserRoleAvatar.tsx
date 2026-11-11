import React from 'react';
import { Role } from '../../types';
import { 
  Crown, 
  ShieldCheck, 
  Wallet, 
  BookOpenCheck, 
  Megaphone, 
  Headphones, 
  Truck, 
  ShoppingCart, 
  User as UserIcon 
} from 'lucide-react';

interface UserRoleAvatarProps {
  role?: Role | string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

export const ROLE_ICON_CONFIG: Record<string, {
  icon: React.ElementType;
  bgGradient: string;
  textColor: string;
  borderColor: string;
  label: string;
}> = {
  direktur_utama: {
    icon: Crown,
    bgGradient: 'from-amber-500 to-amber-600',
    textColor: 'text-amber-100',
    borderColor: 'border-amber-400',
    label: 'Direktur Utama'
  },
  super_admin: {
    icon: ShieldCheck,
    bgGradient: 'from-slate-800 to-slate-900',
    textColor: 'text-slate-100',
    borderColor: 'border-slate-700',
    label: 'Super Admin'
  },
  finance_manager: {
    icon: Wallet,
    bgGradient: 'from-blue-600 to-blue-700',
    textColor: 'text-blue-100',
    borderColor: 'border-blue-400',
    label: 'Finance & Kasir'
  },
  accounting_manager: {
    icon: BookOpenCheck,
    bgGradient: 'from-emerald-700 to-emerald-800',
    textColor: 'text-emerald-100',
    borderColor: 'border-emerald-500',
    label: 'Accounting & Buku Besar'
  },
  marketing_manager: {
    icon: Megaphone,
    bgGradient: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-100',
    borderColor: 'border-blue-400',
    label: 'Marketing & Promosi'
  },
  sales_cs: {
    icon: Headphones,
    bgGradient: 'from-emerald-600 to-emerald-700',
    textColor: 'text-emerald-100',
    borderColor: 'border-emerald-400',
    label: 'Sales CS & Reservasi'
  },
  procurement_logistics: {
    icon: Truck,
    bgGradient: 'from-amber-600 to-amber-700',
    textColor: 'text-amber-100',
    borderColor: 'border-amber-400',
    label: 'Logistik & Gudang'
  },
  purchasing_officer: {
    icon: ShoppingCart,
    bgGradient: 'from-blue-600 to-blue-700',
    textColor: 'text-blue-100',
    borderColor: 'border-blue-400',
    label: 'Purchasing & PO'
  }
};

const SIZE_CONFIG = {
  xs: {
    box: 'w-6 h-6 rounded-lg',
    iconSize: 'w-3 h-3'
  },
  sm: {
    box: 'w-8 h-8 rounded-xl',
    iconSize: 'w-4 h-4'
  },
  md: {
    box: 'w-10 h-10 rounded-xl',
    iconSize: 'w-5 h-5'
  },
  lg: {
    box: 'w-12 h-12 rounded-2xl',
    iconSize: 'w-6 h-6'
  },
  xl: {
    box: 'w-16 h-16 rounded-2xl',
    iconSize: 'w-8 h-8'
  }
};

export default function UserRoleAvatar({
  role = 'super_admin',
  name,
  size = 'md',
  className = '',
  showBadge = false
}: UserRoleAvatarProps) {
  const config = ROLE_ICON_CONFIG[role] || {
    icon: UserIcon,
    bgGradient: 'from-slate-600 to-slate-700',
    textColor: 'text-slate-100',
    borderColor: 'border-slate-400',
    label: 'User'
  };

  const IconComponent = config.icon;
  const sizeStyles = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <div
        className={`${sizeStyles.box} bg-gradient-to-br ${config.bgGradient} ${config.textColor} border ${config.borderColor} flex items-center justify-center shadow-xs font-bold transition-all`}
        title={name ? `${name} (${config.label})` : config.label}
      >
        <IconComponent className={sizeStyles.iconSize} />
      </div>
      {showBadge && (
        <span
          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"
          title="Online"
        />
      )}
    </div>
  );
}
