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
    padding: '36 40',
  },
  titleSection: {
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 20,
  },
  mainTitle: {
    fontSize: 22,
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
    gap: 20,
    marginBottom: 28,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
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
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1A3C6E',
  },
  infoValueSmall: {
    fontSize: 10,
    color: '#374151',
    marginTop: 2,
  },
  contactSection: {
    backgroundColor: '#1A3C6E',
    padding: 16,
    borderRadius: 6,
    marginBottom: 20,
  },
  contactLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  contactName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#C8973A',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  noticeBox: {
    backgroundColor: '#FEF9EE',
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f0d9a0',
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.7,
    textAlign: 'center',
  },
  bottomBand: {
    backgroundColor: '#1A3C6E',
    padding: '12 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.4)',
  },
  documentToken: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Helvetica',
  },
})

interface VoucherVisiteData {
  prospect: { nom: string; prenom: string }
  date_visite: string
  apporteur: { nom: string; prenom: string; telephone?: string }
  token: string
}

function VoucherVisiteDocument({ prospect, date_visite, apporteur, token }: VoucherVisiteData) {
  return (
    <Document>
      <Page size={[595, 420]} style={styles.page}>
        {/* Header */}
        <View style={styles.topBand}>
          <View>
            <Text style={styles.brandName}>AZEMBAY</Text>
            <Text style={styles.brandSub}>RIPT 1 — Off-Market — Sidi Bou Naim</Text>
          </View>
          <View>
            <Text style={styles.invitationLabel}>INVITATION VISITE EXCLUSIVE</Text>
            <Text style={[styles.invitationLabel, { color: '#C8973A', fontSize: 10, marginTop: 4 }]}>GOLDEN HOUR 2026</Text>
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
              <Text style={styles.infoLabel}>Lieu</Text>
              <Text style={styles.infoValue}>Azembay</Text>
              <Text style={styles.infoValueSmall}>Sidi Bou Naim, Maroc</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Date de visite</Text>
              <Text style={styles.infoValue}>{date_visite}</Text>
            </View>
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>VOTRE POINT DE CONTACT CHEZ AZEMBAY</Text>
            <Text style={styles.contactName}>{apporteur.prenom} {apporteur.nom}</Text>
            {apporteur.telephone && <Text style={styles.contactPhone}>{apporteur.telephone}</Text>}
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Merci de vous munir d&apos;une pièce d&apos;identité à la réception afin de confirmer votre visite.
              {'\n'}Document personnel et non cessible — Réservé aux membres invités.
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

export async function generateVoucherVisitePDF(data: VoucherVisiteData): Promise<Buffer> {
  const buffer = await renderToBuffer(<VoucherVisiteDocument {...data} />)
  return Buffer.from(buffer)
}
