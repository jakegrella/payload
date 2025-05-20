import type { Payload } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'

import type { NextRESTClient } from '../helpers/NextRESTClient.js'

import { initPayloadInt } from '../helpers/initPayloadInt.js'
let payload: Payload
let restClient: NextRESTClient

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

describe('folders', () => {
  beforeAll(async () => {
    ;({ payload, restClient } = await initPayloadInt(dirname))
  })

  afterAll(async () => {
    if (typeof payload.db.destroy === 'function') {
      await payload.db.destroy()
    }
  })

  beforeEach(async () => {
    await payload.delete({
      collection: 'posts',
      depth: 0,
      where: {
        id: {
          exists: true,
        },
      },
    })
    await payload.delete({
      collection: '_folders',
      depth: 0,
      where: {
        id: {
          exists: true,
        },
      },
    })
  })

  describe('folder > subfolder querying', () => {
    it('should populate subfolders for folder by ID', async () => {
      const parentFolder = await payload.create({
        collection: '_folders',
        data: {
          name: 'Parent Folder',
        },
      })
      const folderIDFromParams = parentFolder.id

      await payload.create({
        collection: '_folders',
        data: {
          name: 'Nested 1',
          _folder: folderIDFromParams,
        },
      })

      await payload.create({
        collection: '_folders',
        data: {
          name: 'Nested 2',
          _folder: folderIDFromParams,
        },
      })

      const parentFolderQuery = await payload.findByID({
        collection: '_folders',
        id: folderIDFromParams,
      })

      expect(parentFolderQuery.documentsAndFolders.docs).toHaveLength(2)
    })
  })

  describe('folder > file querying', () => {
    it('should populate files for folder by ID', async () => {
      const parentFolder = await payload.create({
        collection: '_folders',
        data: {
          name: 'Parent Folder',
        },
      })
      const folderIDFromParams = parentFolder.id

      await payload.create({
        collection: 'posts',
        data: {
          title: 'Post 1',
          _folder: folderIDFromParams,
        },
      })

      await payload.create({
        collection: 'posts',
        data: {
          title: 'Post 2',
          _folder: folderIDFromParams,
        },
      })

      const parentFolderQuery = await payload.findByID({
        collection: '_folders',
        id: folderIDFromParams,
      })

      expect(parentFolderQuery.documentsAndFolders.docs).toHaveLength(2)
    })
  })

  describe('hooks', () => {
    it('reparentChildFolder should change the child after updating the parent', async () => {
      const parentFolder = await payload.create({
        collection: '_folders',
        data: {
          name: 'Parent Folder',
        },
      })

      const childFolder = await payload.create({
        collection: '_folders',
        data: {
          name: 'Parent Folder',
          _folder: parentFolder,
        },
      })

      await payload.update({
        collection: '_folders',
        data: { _folder: childFolder },
        id: parentFolder.id,
      })

      const parentAfter = await payload.findByID({
        collection: '_folders',
        id: parentFolder.id,
        depth: 0,
      })
      const childAfter = await payload.findByID({
        collection: '_folders',
        id: childFolder.id,
        depth: 0,
      })
      expect(childAfter._folder).toBeFalsy()
      expect(parentAfter._folder).toBe(childFolder.id)
    })

    it('dissasociateAfterDelete should delete _folder value in children after deleting the folder', async () => {
      const parentFolder = await payload.create({
        collection: '_folders',
        data: {
          name: 'Parent Folder',
        },
      })

      const post = await payload.create({ collection: 'posts', data: { _folder: parentFolder } })

      await payload.delete({ collection: '_folders', id: parentFolder.id })
      const postAfter = await payload.findByID({ collection: 'posts', id: post.id })
      expect(postAfter._folder).toBeFalsy()
    })
  })
})
