import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

export const Settings: CollectionConfig = {
  slug: 'settings',
  fields: [
    {
      name: 'site',
      type: 'text',
      index: true,
    },
  ],
  versions: false,
  authorship: false,
}

const findSettings =
  (pagination: boolean): CollectionBeforeChangeHook =>
  async ({ data, req }) => {
    await req.payload.find({
      collection: 'settings',
      where: {
        site: {
          equals: data.site,
        },
      },
      limit: 1,
      pagination,
      depth: 0,
      req,
      overrideAccess: true,
    })
    return data
  }

// Source 1: the first command in the create's transaction is a paginated find (count + docs in parallel).
export const Orders: CollectionConfig = {
  slug: 'orders',
  hooks: {
    beforeChange: [findSettings(true)],
  },
  fields: [
    {
      name: 'site',
      type: 'text',
    },
  ],
  versions: false,
  authorship: false,
}

// Control: the same hook without the count query.
export const OrdersUnpaginated: CollectionConfig = {
  slug: 'orders-unpaginated',
  hooks: {
    beforeChange: [findSettings(false)],
  },
  fields: [
    {
      name: 'site',
      type: 'text',
    },
  ],
  versions: false,
  authorship: false,
}

export const Tags: CollectionConfig = {
  slug: 'tags',
  fields: [
    {
      name: 'name',
      type: 'text',
    },
  ],
  versions: false,
  authorship: false,
}

// Source 2: each array row validates its filterOptions with its own find, all rows in parallel.
export const Posts: CollectionConfig = {
  slug: 'posts',
  fields: [
    {
      name: 'rows',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'relationship',
          relationTo: 'tags',
          filterOptions: {
            name: {
              exists: true,
            },
          },
        },
      ],
    },
  ],
  versions: false,
  authorship: false,
}
