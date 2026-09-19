import {defineArrayMember, defineField, defineType} from 'sanity'

export const runbookType = defineType({
  name: 'runbook',
  title: 'Runbook',
  type: 'document',
  fields: [
    defineField({
      name: 'service',
      title: 'Service',
      type: 'reference',
      to: [{type: 'service'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'symptoms', title: 'Symptoms', type: 'text', rows: 5}),
    defineField({
      name: 'procedure',
      title: 'Procedure',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'applicableVersions',
      title: 'Applicable versions',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'environment',
      title: 'Environment',
      type: 'string',
      options: {
        list: [
          {title: 'Any', value: 'any'},
          {title: 'Development', value: 'development'},
          {title: 'Staging', value: 'staging'},
          {title: 'Production', value: 'production'},
        ],
        layout: 'radio',
      },
    }),
    defineField({name: 'lastUpdated', title: 'Last updated', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'title', service: 'service.name', environment: 'environment'},
    prepare({title, service, environment}) {
      return {title, subtitle: [service, environment].filter(Boolean).join(' · ')}
    },
  },
})
