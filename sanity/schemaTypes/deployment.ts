import {defineArrayMember, defineField, defineType} from 'sanity'

export const deploymentType = defineType({
  name: 'deployment',
  title: 'Deployment',
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
      name: 'version',
      title: 'Version',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'environment',
      title: 'Environment',
      type: 'string',
      options: {
        list: [
          {title: 'Development', value: 'development'},
          {title: 'Staging', value: 'staging'},
          {title: 'Production', value: 'production'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'deployedAt',
      title: 'Deployed at',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'commit', title: 'Commit', type: 'string'}),
    defineField({
      name: 'changes',
      title: 'Changes',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'change'}]})],
      validation: (rule) => rule.unique(),
    }),
    defineField({name: 'deployedBy', title: 'Deployed by', type: 'string'}),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Pending', value: 'pending'},
          {title: 'In progress', value: 'inProgress'},
          {title: 'Succeeded', value: 'succeeded'},
          {title: 'Failed', value: 'failed'},
          {title: 'Rolled back', value: 'rolledBack'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {service: 'service.name', version: 'version', environment: 'environment'},
    prepare({service, version, environment}) {
      return {
        title: [service, version].filter(Boolean).join(' · ') || 'Untitled deployment',
        subtitle: environment,
      }
    },
  },
})
