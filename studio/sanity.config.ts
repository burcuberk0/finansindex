import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'FinansIndex Yayın',
  projectId: 'u13dxmis',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {types: schemaTypes},
})
