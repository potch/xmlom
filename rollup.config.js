module.exports = {
  name: 'xmlom',
  input: 'index.js',
  output: {
    file: 'browser/xmlom.js',
    format: 'iife'
  },
  intro: 'var global = window;',
  plugins: [
    require('rollup-plugin-node-builtins')(),
    require('rollup-plugin-node-resolve')({
      jsnext: true,
      main: true
    }),
    require('rollup-plugin-commonjs')({
      include: [
        'node_modules/**',
        './*'
      ]
    })
  ]
}
