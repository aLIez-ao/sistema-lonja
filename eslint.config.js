import js from '@eslint/js';
import globals from 'globals';
import nodePlugin from 'eslint-plugin-n';

const importsInternosDeModulo = {
  group: [
    '../*/controladores/**',
    '../../*/controladores/**',
    '../*/servicios/**',
    '../../*/servicios/**',
    '../*/ayudantes/**',
    '../../*/ayudantes/**',
    '../*/rutas/**',
    '../../*/rutas/**',
    '../helpers/**',
    '../../helpers/**',
    '../../../helpers/**',
  ],
  message: 'Importa otro módulo solo desde su index.js y comparte utilidades desde compartido/.',
};

const reglaLimitesModulo = (dependenciasProhibidas) => [
  'error',
  { patterns: [importsInternosDeModulo, ...dependenciasProhibidas] },
];

export default [
  {
    ignores: [
      '**/.claude/**',
      '**/node_modules/**',
      'public/bootstrap/**',
      'public/chartjs/**',
      'public/uploads/**',
      'doc/**',
    ],
  },
  js.configs.recommended,
  nodePlugin.configs['flat/recommended-module'],
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { globals: globals.node },
    settings: { node: { version: '>=20' } },
    rules: {
      'no-unused-vars': 'warn',
      'no-control-regex': 'off',
      'n/no-process-exit': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
    },
  },
  {
    files: ['public/js/**/*.js'],
    languageOptions: { globals: { ...globals.browser, bootstrap: 'readonly', Chart: 'readonly' } },
  },
  {
    files: ['modulos/**/*.js'],
    rules: {
      'no-restricted-imports': reglaLimitesModulo([]),
    },
  },
  {
    files: ['modulos/cuentas/**/*.js'],
    rules: {
      'no-restricted-imports': reglaLimitesModulo([
        { group: ['../catalogo/**', '../../catalogo/**'], message: 'cuentas no depende de catálogo.' },
        { group: ['../ventas/**', '../../ventas/**'], message: 'cuentas no depende de ventas.' },
        { group: ['../tienda/**', '../../tienda/**'], message: 'cuentas no depende de tienda.' },
        { group: ['../pedidos/**', '../../pedidos/**'], message: 'cuentas no depende de pedidos.' },
      ]),
    },
  },
  {
    files: ['modulos/catalogo/**/*.js'],
    rules: {
      'no-restricted-imports': reglaLimitesModulo([
        { group: ['../cuentas/**', '../../cuentas/**'], message: 'catálogo no depende de cuentas.' },
        { group: ['../ventas/**', '../../ventas/**'], message: 'catálogo no depende de ventas.' },
        { group: ['../tienda/**', '../../tienda/**'], message: 'catálogo no depende de tienda.' },
        { group: ['../pedidos/**', '../../pedidos/**'], message: 'catálogo no depende de pedidos.' },
      ]),
    },
  },
  {
    files: ['modulos/ventas/**/*.js'],
    rules: {
      'no-restricted-imports': reglaLimitesModulo([
        { group: ['../tienda/**', '../../tienda/**'], message: 'ventas no depende de tienda.' },
        { group: ['../pedidos/**', '../../pedidos/**'], message: 'ventas no depende de pedidos.' },
      ]),
    },
  },
  {
    files: ['modulos/tienda/**/*.js'],
    rules: {
      'no-restricted-imports': reglaLimitesModulo([
        { group: ['../cuentas/**', '../../cuentas/**'], message: 'tienda solo depende de catálogo.' },
        { group: ['../ventas/**', '../../ventas/**'], message: 'tienda solo depende de catálogo.' },
        { group: ['../pedidos/**', '../../pedidos/**'], message: 'tienda solo depende de catálogo.' },
      ]),
    },
  },
  {
    files: ['modulos/pedidos/**/*.js'],
    rules: {
      'no-restricted-imports': reglaLimitesModulo([
        { group: ['../tienda/**', '../../tienda/**'], message: 'pedidos no depende de tienda.' },
        { group: ['../ventas/**', '../../ventas/**'], message: 'pedidos no depende de ventas.' },
      ]),
    },
  },
  {
    files: ['compartido/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../modulos/**', '../../modulos/**', '../../../modulos/**'],
              message: 'compartido no depende de los módulos de negocio.',
            },
          ],
        },
      ],
    },
  },
];
