'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function uploadDocument(formData: FormData) {
  const admin = createAdminClient()

  const file = formData.get('file') as File
  const nom = formData.get('nom') as string
  const description = formData.get('description') as string
  const categorie = formData.get('categorie') as string
  const etape_disponibilite = formData.get('etape_disponibilite') as string
  const profils_autorises = JSON.parse(formData.get('profils_autorises') as string || '[]')
  const forward_autorise = formData.get('forward_autorise') === 'true'
  const uploaded_by = formData.get('uploaded_by') as string

  if (!file || !nom || !categorie) {
    return { success: false, error: 'Données manquantes' }
  }

  // Upload to Supabase Storage
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { data: uploadData, error: uploadError } = await admin.storage
    .from('documents')
    .upload(fileName, fileBuffer, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    })

  if (uploadError) return { success: false, error: uploadError.message }

  // Insert document record
  const { data: document, error } = await admin
    .from('documents')
    .insert({
      nom,
      description,
      categorie,
      file_path: uploadData.path,
      file_type: file.type || 'application/pdf',
      etape_disponibilite,
      profils_autorises,
      forward_autorise,
      actif: true,
      uploaded_by,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, document }
}

export async function toggleDocumentActif(documentId: string, actif: boolean) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('documents')
    .update({ actif })
    .eq('id', documentId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
