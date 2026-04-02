import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { SecureViewer } from './secure-viewer'

export const dynamic = 'force-dynamic'

export default async function ViewerPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient()

  // Fetch lien by token
  const { data: lien } = await supabase
    .from('liens_securises')
    .select('*, prospect:prospects(nom,prenom), document:documents(nom,file_path,file_type)')
    .eq('token', params.token)
    .single()

  if (!lien) notFound()

  // Check expiry
  if (new Date(lien.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-[#1A3C6E] flex items-center justify-center">
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-[#C8973A] mb-2">Lien expiré</h1>
          <p className="text-white/60">Ce lien a expiré. Contactez votre conseiller Azembay.</p>
        </div>
      </div>
    )
  }

  // Increment consultation count
  await supabase
    .from('liens_securises')
    .update({
      nb_consultations: (lien.nb_consultations || 0) + 1,
      derniere_consultation: new Date().toISOString(),
    })
    .eq('id', lien.id)

  // Get signed URL for document
  const doc = lien.document as { nom: string; file_path: string; file_type: string }
  const prospect = lien.prospect as { nom: string; prenom: string }

  const { data: signedUrl } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 3600) // 1 hour

  const fileUrl = signedUrl?.signedUrl || null

  return (
    <SecureViewer
      fileUrl={fileUrl}
      documentNom={doc.nom}
      prospectNom={`${prospect.prenom} ${prospect.nom}`}
      expiresAt={lien.expires_at}
      consultations={(lien.nb_consultations || 0) + 1}
    />
  )
}
