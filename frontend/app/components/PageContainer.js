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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className={noPadding ? '' : 'py-8 px-4 sm:px-6 lg:px-8'}>
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          {(title || actions) && (
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {title && (
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                      {title}
                    </h1>
                    {subtitle && (
                      <p className="mt-2 text-base text-gray-700">
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
