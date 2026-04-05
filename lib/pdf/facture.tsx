import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Earth Résidences company info
const EARTH_RESIDENCES = {
  nom: 'Earth Résidences',
  capital: 'Société au capital de 5 000 000 DHS',
  adresse: '197 angle avenue Zerktouni rue Chellah N°7, 3ème étage',
  ville: 'Casablanca, Maroc',
  rc: '258 407',
  patente: '35774751',
  if_num: '40489825',
  ice: '002523010000037',
  tel: '+212 (0)5 22 79 09 00',
  fax: '+212 (0)5 22 79 09 10',
  email: 'info@earth.ma',
  site: 'www.earth-holding.com',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1A3C6E',
  },
  companyBlock: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1A3C6E',
    marginBottom: 3,
  },
  companyCapital: {
    fontSize: 7,
    color: '#666',
    marginBottom: 6,
  },
  companyInfo: {
    fontSize: 7.5,
    color: '#444',
    lineHeight: 1.5,
  },
  legalBlock: {
    fontSize: 7,
    color: '#666',
    textAlign: 'right',
    lineHeight: 1.6,
  },
  titleBlock: {
    marginBottom: 24,
    alignItems: 'center',
  },
  factureTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1A3C6E',
    letterSpacing: 2,
    marginBottom: 4,
  },
  factureNum: {
    fontSize: 10,
    color: '#C8973A',
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  prospectBlock: {
    flex: 1,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    marginRight: 12,
  },
  dateBlock: {
    width: 160,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
  },
  blockLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1A3C6E',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  blockValue: {
    fontSize: 9,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  table: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1A3C6E',
    padding: '8 12',
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '10 12',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'right' },
  totalSection: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    minWidth: 220,
  },
  totalLabel: {
    fontSize: 9,
    color: '#6b7280',
    width: 120,
    textAlign: 'right',
    paddingRight: 12,
  },
  totalValue: {
    fontSize: 9,
    color: '#1a1a1a',
    width: 100,
    textAlign: 'right',
  },
  totalTTCRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#1A3C6E',
    padding: '8 12',
    borderRadius: 4,
    minWidth: 220,
  },
  totalTTCLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'right',
    paddingRight: 12,
  },
  totalTTCValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#C8973A',
    width: 100,
    textAlign: 'right',
  },
  noticeBox: {
    padding: 14,
    backgroundColor: '#FEF9EE',
    borderLeftWidth: 3,
    borderLeftColor: '#C8973A',
    marginBottom: 20,
    borderRadius: 2,
  },
  noticeText: {
    fontSize: 8,
    color: '#666',
    lineHeight: 1.6,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  goldAccent: {
    width: 40,
    height: 2,
    backgroundColor: '#C8973A',
    marginBottom: 6,
  },
})

interface FactureData {
  facture: {
    numero_facture: string
    date_emission: string
    montant_ht: number
    tva_pct: number
    montant_ttc: number
  }
  prospect: {
    nom: string
    prenom: string
    email?: string
    telephone?: string
    ville?: string
  }
  sejour: {
    date_arrivee: string
    date_depart: string
  }
}

function formatMAD(n: number) {
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' MAD'
}

function FactureDocument({ facture, prospect, sejour }: FactureData) {
  const tva = facture.montant_ht * (facture.tva_pct / 100)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>Earth Résidences</Text>
            <Text style={styles.companyCapital}>{EARTH_RESIDENCES.capital}</Text>
            <Text style={styles.companyInfo}>{EARTH_RESIDENCES.adresse}</Text>
            <Text style={styles.companyInfo}>{EARTH_RESIDENCES.ville}</Text>
            <Text style={styles.companyInfo}>Tél. {EARTH_RESIDENCES.tel} — {EARTH_RESIDENCES.email}</Text>
          </View>
          <View style={styles.legalBlock}>
            <Text>RC : {EARTH_RESIDENCES.rc}</Text>
            <Text>Patente : {EARTH_RESIDENCES.patente}</Text>
            <Text>IF : {EARTH_RESIDENCES.if_num}</Text>
            <Text style={{ color: '#1A3C6E', fontFamily: 'Helvetica-Bold' }}>ICE : {EARTH_RESIDENCES.ice}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.factureTitle}>FACTURE</Text>
          <View style={styles.goldAccent} />
          <Text style={styles.factureNum}>{facture.numero_facture}</Text>
        </View>

        {/* Client + Date */}
        <View style={styles.section}>
          <View style={styles.prospectBlock}>
            <Text style={styles.blockLabel}>Facturé à</Text>
            <Text style={[styles.blockValue, { fontFamily: 'Helvetica-Bold' }]}>
              {prospect.prenom} {prospect.nom}
            </Text>
            {prospect.email && <Text style={styles.blockValue}>{prospect.email}</Text>}
            {prospect.telephone && <Text style={styles.blockValue}>{prospect.telephone}</Text>}
            {prospect.ville && <Text style={styles.blockValue}>{prospect.ville}</Text>}
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.blockLabel}>Date d&apos;émission</Text>
            <Text style={styles.blockValue}>{facture.date_emission}</Text>
            <Text style={[styles.blockLabel, { marginTop: 10 }]}>Période du séjour</Text>
            <Text style={styles.blockValue}>{sejour.date_arrivee}</Text>
            <Text style={styles.blockValue}>→ {sejour.date_depart}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Désignation</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Qté</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Montant HT</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.col1]}>
              Forfait séjour test non honoré — Azembay RIPT 1{'\n'}
              <Text style={{ color: '#9ca3af', fontSize: 7.5 }}>
                Séjour prévu du {sejour.date_arrivee} au {sejour.date_depart}
              </Text>
            </Text>
            <Text style={[styles.tableCell, styles.col2]}>1</Text>
            <Text style={[styles.tableCell, styles.col3]}>{formatMAD(facture.montant_ht)}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Montant HT</Text>
            <Text style={styles.totalValue}>{formatMAD(facture.montant_ht)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA ({facture.tva_pct}%)</Text>
            <Text style={styles.totalValue}>{formatMAD(tva)}</Text>
          </View>
          <View style={styles.totalTTCRow}>
            <Text style={styles.totalTTCLabel}>TOTAL TTC</Text>
            <Text style={styles.totalTTCValue}>{formatMAD(facture.montant_ttc)}</Text>
          </View>
        </View>

        {/* Notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            En cas d&apos;acquisition d&apos;une unité Azembay RIPT 1, le montant de cette facture fera l&apos;objet d&apos;un avoir déduit du prix de vente.
            {'\n'}Règlement par virement bancaire ou chèque à l&apos;ordre d&apos;Earth Résidences.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Earth Résidences — {EARTH_RESIDENCES.adresse}, {EARTH_RESIDENCES.ville}
            {'\n'}RC {EARTH_RESIDENCES.rc} — Patente {EARTH_RESIDENCES.patente} — IF {EARTH_RESIDENCES.if_num} — ICE {EARTH_RESIDENCES.ice}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateFacturePDF(data: FactureData): Promise<Buffer> {
  const buffer = await renderToBuffer(<FactureDocument {...data} />)
  return Buffer.from(buffer)
}
