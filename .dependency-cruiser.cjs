const rule = (name, from, to) => ({ name, severity: 'error', from, to });
const internal = '^src/';
module.exports = {
  forbidden: [
    rule('no-circular', {}, { circular: true }),
    rule('no-unresolved', {}, { couldNotResolve: true }),
    rule(
      'shared-independent',
      { path: '^src/shared/' },
      { path: '^src/(app|features|client|server)/' },
    ),
    rule(
      'client-no-server',
      { path: '^src/(client|features|shared)/' },
      {
        path: '^src/server/|(^|/)(server-only|postgres|drizzle-orm|@clerk/nextjs/server|@aws-sdk|@vercel/otel)(/|$)',
      },
    ),
    rule('client-no-app', { path: '^src/(client|features)/' }, { path: '^src/app/' }),
    rule(
      'presentation-no-data',
      { path: '^src/(features/[^/]+/components|shared/ui)/' },
      {
        path: '^src/(features/[^/]+/(pages|data-access)|client|app|server)/',
        dependencyTypesNot: ['type-only'],
      },
    ),
    rule(
      'presentation-no-data-libraries',
      { path: '^src/(features/[^/]+/components|shared/ui)/' },
      {
        path: '(^|/)(@tanstack/react-query|zustand|axios|swr|next/navigation)(/|$)',
        dependencyTypesNot: ['type-only'],
      },
    ),
    rule(
      'data-access-no-ui',
      { path: '^src/features/[^/]+/data-access/' },
      { path: '^src/(app|client|features/[^/]+/(pages|components)|shared/ui)/' },
    ),
    rule(
      'features-isolated',
      { path: '^src/features/([^/]+)/' },
      { path: '^src/features/[^/]+/', pathNot: '^src/features/$1/' },
    ),
    rule(
      'routes-only-use-application',
      { path: '^src/app/' },
      { path: '^src/server/(modules|infrastructure)/' },
    ),
    rule(
      'routes-no-database-or-vendor-sdk',
      { path: '^src/app/' },
      { path: '(^|/)(postgres|drizzle-orm|@aws-sdk|openai)(/|$)' },
    ),
    rule(
      'server-no-client',
      { path: '^src/server/' },
      { path: '^src/(app|features|client|shared/ui)/' },
    ),
    rule(
      'application-uses-module-public-api',
      { path: '^src/server/application/' },
      { path: '^src/server/modules/[^/]+/(repositories|domain)/' },
    ),
    rule(
      'application-no-infrastructure',
      { path: '^src/server/application/' },
      {
        path: '^src/server/infrastructure/',
        pathNot: '^src/server/infrastructure/bootstrap[.]ts$',
      },
    ),
    rule(
      'modules-no-outward-dependencies',
      { path: '^src/server/modules/' },
      { path: '^src/server/(application|infrastructure)/' },
    ),
    rule(
      'modules-isolated',
      { path: '^src/server/modules/([^/]+)/' },
      { path: '^src/server/modules/[^/]+/', pathNot: '^src/server/modules/$1/' },
    ),
    rule(
      'domain-pure',
      { path: '^src/server/modules/[^/]+/domain/' },
      { path: internal, pathNot: '^src/(server/modules/[^/]+/domain|shared/lib)/' },
    ),
    rule(
      'domain-no-framework',
      { path: '^src/server/modules/[^/]+/domain/' },
      { path: 'node_modules|^node:' },
    ),
    rule(
      'repositories-no-services',
      { path: '^src/server/modules/[^/]+/repositories/' },
      { path: '^src/server/modules/[^/]+/services/' },
    ),
    rule(
      'business-no-sdk',
      { path: '^src/server/(application|modules)/' },
      {
        path: '(^|/)(next|react|postgres|drizzle-orm|@clerk|@aws-sdk|@vercel|openai)(/|$)',
        dependencyTypesNot: ['type-only'],
      },
    ),
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '[.](test|stories)[.]tsx?$|^src/test/' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
