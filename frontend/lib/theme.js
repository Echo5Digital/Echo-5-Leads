/**
 * Design System - Consistent styling across the application
 */

export const colors = {
  // Primary colors
  primary: {
    DEFAULT: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    textLight: 'text-blue-700',
    textDark: 'text-blue-800',
    border: 'border-blue-600',
  },
  
  // Status colors
  success: {
    DEFAULT: 'bg-green-600',
    hover: 'hover:bg-green-700',
    light: 'bg-green-50',
    text: 'text-green-600',
    badge: 'bg-green-100 text-green-800',
  },
  
  warning: {
    DEFAULT: 'bg-amber-600',
    hover: 'hover:bg-amber-700',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800',
  },
  
  danger: {
    DEFAULT: 'bg-red-600',
    hover: 'hover:bg-red-700',
    light: 'bg-red-50',
    text: 'text-red-600',
    badge: 'bg-red-100 text-red-800',
  },
  
  // Neutral colors
  gray: {
    bg: 'bg-gray-50',
    surface: 'bg-white',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-500',
    border: 'border-gray-200',
    borderHover: 'hover:border-gray-300',
  },
  
  // Role colors
  role: {
    superAdmin: 'bg-purple-100 text-purple-800',
    clientAdmin: 'bg-blue-100 text-blue-800',
    member: 'bg-green-100 text-green-800',
  },
};

export const buttons = {
  primary: `px-4 py-2.5 ${colors.primary.DEFAULT} text-white rounded-lg font-medium ${colors.primary.hover} transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2`,
  secondary: `px-4 py-2.5 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 border ${colors.gray.border} ${colors.gray.borderHover}`,
  danger: `px-4 py-2.5 ${colors.danger.DEFAULT} text-white rounded-lg font-medium ${colors.danger.hover} transition-all duration-200`,
  ghost: `px-4 py-2.5 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-all duration-200`,
  sm: `px-3 py-1.5 text-sm rounded-md`,
};

export const cards = {
  default: `bg-white rounded-xl shadow-sm border ${colors.gray.border} p-6`,
  hover: `bg-white rounded-xl shadow-sm border ${colors.gray.border} p-6 hover:shadow-md transition-all duration-200`,
  highlighted: `bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6`,
};

export const inputs = {
  default: `w-full px-3 py-2.5 border ${colors.gray.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm`,
  select: `w-full px-3 py-2.5 border ${colors.gray.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white`,
  search: `w-full px-4 py-2.5 pl-10 border ${colors.gray.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm`,
  textarea: `w-full px-3 py-2.5 border ${colors.gray.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm resize-none`,
};

export const badges = {
  primary: `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors.primary.text} bg-blue-50`,
  success: `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors.success.badge}`,
  warning: `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors.warning.badge}`,
  danger: `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors.danger.badge}`,
  gray: `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-700`,
};

export const table = {
  container: `bg-white rounded-xl shadow-sm overflow-hidden border ${colors.gray.border}`,
  header: `bg-gray-50`,
  headerCell: `px-6 py-3.5 text-left text-xs font-semibold ${colors.gray.textSecondary} uppercase tracking-wider`,
  row: `hover:bg-gray-50 transition-colors duration-150`,
  cell: `px-6 py-4 whitespace-nowrap text-sm ${colors.gray.text}`,
};

export const typography = {
  h1: `text-3xl font-bold ${colors.gray.text}`,
  h2: `text-2xl font-bold ${colors.gray.text}`,
  h3: `text-xl font-semibold ${colors.gray.text}`,
  h4: `text-lg font-semibold ${colors.gray.text}`,
  body: `text-sm ${colors.gray.text}`,
  bodySecondary: `text-sm ${colors.gray.textSecondary}`,
  bodyMuted: `text-sm ${colors.gray.textMuted}`,
  caption: `text-xs ${colors.gray.textMuted}`,
};

export const layout = {
  page: `min-h-screen ${colors.gray.bg} py-8 px-4`,
  container: `max-w-7xl mx-auto`,
  section: `mb-8`,
};

export const modal = {
  overlay: `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4`,
  container: `bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto`,
  header: `p-6 border-b ${colors.gray.border}`,
  body: `p-6`,
  footer: `p-6 border-t ${colors.gray.border} flex gap-3`,
};

export const getRoleBadgeClass = (role) => {
  const roleMap = {
    'super_admin': colors.role.superAdmin,
    'client_admin': colors.role.clientAdmin,
    'member': colors.role.member,
  };
  return `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleMap[role] || colors.gray}`;
};

export const getStatusBadgeClass = (active) => {
  return active 
    ? `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors.success.badge}`
    : `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors.danger.badge}`;
};
