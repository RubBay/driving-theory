import { createStore, useStore } from './storage'

/** Highlighted (saved) questions, per group: question ids in the order they were highlighted. */
type AllHighlights = Record<string, string[]>

const EMPTY: string[] = []
const store = createStore<AllHighlights>('adt:highlights:v1', {})

export function useHighlights(groupId: number): string[] {
  return useStore(store)[groupId] ?? EMPTY
}

export function getHighlights(groupId: number): string[] {
  return store.get()[groupId] ?? EMPTY
}

export function toggleHighlight(groupId: number, id: string): void {
  store.set((all) => {
    const list = all[groupId] ?? []
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    return { ...all, [groupId]: next }
  })
}
