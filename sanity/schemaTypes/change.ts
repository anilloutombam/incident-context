import {defineField, defineType} from 'sanity'

export const changeType = defineType({
  name: 'change',
  title: 'Change',
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
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          {title: 'Code', value: 'code'},
          {title: 'Configuration', value: 'configuration'},
          {title: 'Infrastructure', value: 'infrastructure'},
          {title: 'Data', value: 'data'},
          {title: 'Dependency', value: 'dependency'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'timestamp',
      title: 'Timestamp',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'author', title: 'Author', type: 'string'}),
    defineField({name: 'previousValue', title: 'Previous value', type: 'text', rows: 3}),
    defineField({name: 'newValue', title: 'New value', type: 'text', rows: 3}),
  ],
  preview: {
    select: {title: 'description', service: 'service.name', type: 'type'},
    prepare({title, service, type}) {
      return {
        title: title || 'Untitled change',
        subtitle: [service, type].filter(Boolean).join(' · '),
      }
    },
  },
})
