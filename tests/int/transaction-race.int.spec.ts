// @vitest-environment node
import { getPayload, type CollectionSlug, type Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const ITERATIONS = Number(process.env.ITERATIONS ?? 100)
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 1)

let payload: Payload
let tagIDs: string[] = []

async function createMany(collection: CollectionSlug, data: () => Record<string, unknown>) {
  const failures: string[] = []
  for (let start = 0; start < ITERATIONS; start += CONCURRENCY) {
    const batch = Array.from(
      {
        length: Math.min(CONCURRENCY, ITERATIONS - start),
      },
      () =>
        payload
          .create({
            collection,
            data: data(),
          })
          .catch((error: Error & { code?: number }) => {
            failures.push(error.code ? `${error.code} ${error.message}` : error.message)
          }),
    )
    await Promise.all(batch)
  }
  console.log(
    `${collection}: ${failures.length}/${ITERATIONS} creates failed`,
    failures.slice(0, 3),
  )
  return failures
}

describe(
  'MongoDB transaction race on create',
  {
    timeout: 300_000,
  },
  () => {
    beforeAll(async () => {
      payload = await getPayload({
        config: await config,
      })
      await payload.create({
        collection: 'settings',
        data: {
          site: 'a',
        },
      })
      const tags = await Promise.all(
        ['a', 'b', 'c', 'd', 'e'].map((name) =>
          payload.create({
            collection: 'tags',
            data: {
              name,
            },
          }),
        ),
      )
      tagIDs = tags.map((tag) => tag.id)
    })

    afterAll(async () => {
      for (const collection of [
        'settings',
        'orders',
        'orders-unpaginated',
        'tags',
        'posts',
      ] as const) {
        await payload.delete({
          collection,
          where: {},
        })
      }
      await payload.destroy()
    })

    it('creates with a paginated find in beforeChange', async () => {
      const failures = await createMany('orders', () => ({
        site: 'a',
      }))
      expect(failures).toEqual([])
    })

    it('creates with an unpaginated find in beforeChange (control)', async () => {
      const failures = await createMany('orders-unpaginated', () => ({
        site: 'a',
      }))
      expect(failures).toEqual([])
    })

    it('creates with filterOptions on array rows', async () => {
      const failures = await createMany('posts', () => ({
        rows: tagIDs.map((tag) => ({
          tag,
        })),
      }))
      expect(failures).toEqual([])
    })
  },
)
