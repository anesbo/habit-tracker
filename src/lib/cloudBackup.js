import { supabase } from './supabase'

const BUCKET = 'habit-data'
const FILE_PATH = 'app-state.json'

export async function saveToCloud(appState) {
  const blob = new Blob(
    [JSON.stringify(appState, null, 2)],
    { type: 'application/json' }
  )

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(FILE_PATH, blob, {
      contentType: 'application/json',
      upsert: true
    })

  if (error) throw error
  return data
}

export async function loadFromCloud() {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(FILE_PATH)

  if (error) throw error

  const text = await data.text()
  return JSON.parse(text)
}