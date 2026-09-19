import {defineArrayMember, defineField, defineType} from 'sanity'

const environments = [
  {title: 'Development', value: 'development'},
  {title: 'Staging', value: 'staging'},
  {title: 'Production', value: 'production'},
]

export const serviceType = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'repository',
      title: 'Repository',
      type: 'url',
      validation: (rule) =>
        rule.uri({scheme: ['http', 'https']}).error('Enter a valid HTTP or HTTPS URL'),
    }),
    defineField({
      name: 'owner',
      title: 'Owner',
      type: 'string',
    }),
    defineField({
      name: 'dependencies',
      title: 'Dependencies',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'environment',
      title: 'Environment',
      type: 'string',
      options: {list: environments, layout: 'radio'},
    }),
    defineField({
      name: 'currentVersion',
      title: 'Current version',
      type: 'string',
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'currentVersion'},
  },
})
