import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  topBand: {
    backgroundColor: '#1A3C6E',
    padding: '28 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#C8973A',
    letterSpacing: 4,
  },
  brandSub: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginTop: 3,
  },
  invitationLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textAlign: 'right',
  },
  goldLine: {
    height: 3,
    backgroundColor: '#C8973A',
  },
  body: {
    padding: '32 40',
  },
  titleSection: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 18,
  },
  mainTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1A3C6E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#C8973A',
    letterSpacing: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#C8973A',
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1A3C6E',
  },
  infoValueSmall: {
    fontSize: 9,
    color: '#374151',
    marginTop: 2,
  },
  uniteCard: {
    backgroundColor: '#1A3C6E',
    padding: 14,
    borderRadius: 6,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uniteLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  uniteRef: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#C8973A',
  },
  contactSection: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 6,
  },
  contactName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1A3C6E',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 9,
    color: '#374151',
  },
  noticeBox: {
    backgroundColor: '#FEF9EE',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f0d9a0',
    marginBottom: 0,
  },
  noticeText: {
    fontSize: 8.5,
    color: '#666',
    lineHeight: 1.7,
    textAlign: 'center',
  },
  bottomBand: {
    backgroundColor: '#1A3C6E',
    padding: '10 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  bottomText: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.4)',
  },
  documentToken: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.3)',
  },
})

interface VoucherSejourData {
  prospect: { nom: string; prenom: string }
  date_arrivee: string
  date_depart: string
  nb_adultes: number
  nb_enfants: number
  lot_reference: string
  apporteur: { nom: string; prenom: string; telephone?: string }
  token: string
}

function VoucherSejourDocument({
  prospect, date_arrivee, date_depart, nb_adultes, nb_enfants,
  lot_reference, apporteur, token
}: VoucherSejourData) {
  return (
    <Document>
      <Page size={[595, 500]} style={styles.page}>
        {/* Header */}
        <View style={styles.topBand}>
          <View>
            <Text style={styles.brandName}>AZEMBAY</Text>
            <Text style={styles.brandSub}>RIPT 1 — Off-Market — Sidi Bou Naim</Text>
          </View>
          <View>
            <Text style={styles.invitationLabel}>INVITATION SÉJOUR EXCLUSIF</Text>
            <Text style={[styles.invitationLabel, { color: '#C8973A', fontSize: 9, marginTop: 4 }]}>THE OWNERS&apos; CLUB</Text>
          </View>
        </View>
        <View style={styles.goldLine} />

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>{prospect.prenom} {prospect.nom}</Text>
            <Text style={styles.subtitle}>Invitation nominative et personnelle</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Arrivée</Text>
              <Text style={styles.infoValue}>{date_arrivee}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Départ</Text>
              <Text style={styles.infoValue}>{date_depart}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Participants</Text>
              <Text style={styles.infoValue}>{nb_adultes} adulte{nb_adultes > 1 ? 's' : ''}</Text>
              {nb_enfants > 0 && <Text style={styles.infoValueSmall}>{nb_enfants} enfant{nb_enfants > 1 ? 's' : ''}</Text>}
            </View>
          </View>

          <View style={styles.uniteCard}>
            <View>
              <Text style={styles.uniteLabel}>UNITÉ ASSIGNÉE</Text>
              <Text style={styles.uniteRef}>{lot_reference}</Text>
            </View>
            <View>
              <Text style={[styles.uniteLabel, { textAlign: 'right' }]}>LIEU</Text>
              <Text style={[styles.uniteRef, { fontSize: 11 }]}>Azembay — Sidi Bou Naim</Text>
            </View>
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>VOTRE POINT DE CONTACT CHEZ AZEMBAY</Text>
            <Text style={styles.contactName}>{apporteur.prenom} {apporteur.nom}</Text>
            {apporteur.telephone && <Text style={styles.contactPhone}>{apporteur.telephone}</Text>}
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Merci de vous munir d&apos;une pièce d&apos;identité à la réception afin de confirmer votre séjour.
              {'\n'}Document personnel et non cessible — Réservé aux membres invités du programme The Owners&apos; Club.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.bottomBand}>
          <Text style={styles.bottomText}>CONFIDENTIEL — Document réservé aux membres autorisés</Text>
          <Text style={styles.documentToken}>Réf. {token.slice(0, 12).toUpperCase()}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateVoucherSejourPDF(data: VoucherSejourData): Promise<Buffer> {
  const buffer = await renderToBuffer(<VoucherSejourDocument {...data} />)
  return Buffer.from(buffer)
}
