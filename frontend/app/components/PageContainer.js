/**
 * Consistent page container component for all pages
 * Provides uniform spacing, background, and layout
 */
export default function PageContainer({ 
  title, 
  subtitle, 
  actions, 
  children,
  noPadding = false 
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className={noPadding ? '' : 'py-8 px-4 sm:px-6 lg:px-8'}>
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          {(title || actions) && (
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {title && (
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                      {title}
                    </h1>
                    {subtitle && (
                      <p className="mt-2 text-base text-gray-600">
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
                {actions && (
                  <div className="flex flex-wrap gap-3">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Page Content */}
          {children}
        </div>
      </div>
    </div>
  );
}
