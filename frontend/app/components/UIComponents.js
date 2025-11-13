/**
 * Reusable Card Component with consistent styling
 */
export function Card({ children, className = '', noPadding = false }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card with header section
 */
export function CardHeader({ title, subtitle, actions }) {
  return (
    <div className="border-b border-gray-200 pb-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Stat Card for KPIs
 */
export function StatCard({ label, value, trend, alert = false, icon }) {
  return (
    <Card className={alert ? 'border-2 border-red-400 bg-red-50' : ''}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-2">{label}</div>
          <div className={`text-4xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </div>
          {trend && (
            <div className="mt-2 text-sm text-gray-600">{trend}</div>
          )}
        </div>
        {icon && (
          <div className="text-3xl">{icon}</div>
        )}
      </div>
    </Card>
  );
}

/**
 * Button Component with consistent styling
 */
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  onClick,
  href,
  className = '',
  disabled = false,
  type = 'button'
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`;
  
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}

/**
 * Loading Spinner
 */
export function LoadingSpinner({ size = 'md', text }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizes[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
      {text && <p className="mt-4 text-gray-600">{text}</p>}
    </div>
  );
}

/**
 * Error Message Component
 */
export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
            >
              Try again →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty State Component
 */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {icon && <div className="text-6xl mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{description}</p>
      {action && action}
    </div>
  );
}
