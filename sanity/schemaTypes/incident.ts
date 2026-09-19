import {defineArrayMember, defineField, defineType} from 'sanity'

export const incidentType = defineType({
  name: 'incident',
  title: 'Incident',
  type: 'document',
  fields: [
    defineField({
      name: 'incidentId',
      title: 'Incident ID',
      type: 'string',
      description: 'The operational identifier, for example INC-142.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'affectedServices',
      title: 'Affected services',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})],
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: 'severity',
      title: 'Severity',
      type: 'string',
      options: {
        list: [
          {title: 'SEV-1 — Critical', value: 'sev1'},
          {title: 'SEV-2 — High', value: 'sev2'},
          {title: 'SEV-3 — Medium', value: 'sev3'},
          {title: 'SEV-4 — Low', value: 'sev4'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'startedAt',
      title: 'Started at',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'resolvedAt', title: 'Resolved at', type: 'datetime'}),
    defineField({name: 'symptoms', title: 'Symptoms', type: 'text', rows: 5}),
    defineField({
      name: 'relatedDeployments',
      title: 'Related deployments',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'deployment'}]})],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'relatedChanges',
      title: 'Related changes',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'change'}]})],
      validation: (rule) => rule.unique(),
    }),
    defineField({name: 'rootCause', title: 'Root cause', type: 'text', rows: 5}),
    defineField({name: 'resolution', title: 'Resolution', type: 'text', rows: 5}),
    defineField({
      name: 'relatedRunbook',
      title: 'Related runbook',
      type: 'reference',
      to: [{type: 'runbook'}],
    }),
  ],
  orderings: [
    {
      title: 'Started, newest',
      name: 'startedAtDesc',
      by: [{field: 'startedAt', direction: 'desc'}],
    },
  ],
  preview: {
    select: {title: 'title', incidentId: 'incidentId', severity: 'severity'},
    prepare({title, incidentId, severity}) {
      return {
        title: [incidentId, title].filter(Boolean).join(' · ') || 'Untitled incident',
        subtitle: severity?.toUpperCase(),
      }
    },
  },
})
