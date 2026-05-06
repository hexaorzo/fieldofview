// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Keep the repo readable without fighting formatting rules.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@stylistic/no-multiple-empty-lines': 'off',
      'nuxt/nuxt-config-keys-order': 'off'
    }
  }
)
