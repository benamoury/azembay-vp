'use client'

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

interface VoucherSejourPDFProps {
  prospectNom: string
  prospectPrenom: string
  dateArrivee: string
  dateDepart: string
  nbAdultes: number
  nbEnfantsPlus6: number
  nbEnfantsMoins6: number
  uniteReference: string
  uniteType: string
  apporteurNom: string
  apporteurPrenom: string
}

const LOT_TYPE_LABELS: Record<string, string> = {
  villa_e: 'Villa Parc Type E',
  appart_2ch: 'Appartement 2 chambres',
  appart_1ch: 'Appartement 1 chambre',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 0,
  },
  header: {
    backgroundColor: '#1A3C6E',
    padding: 32,
    paddingBottom: 24,
  },
  headerTitle: {
    color: '#C8973A',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 1,
  },
  goldBand: {
    backgroundColor: '#C8973A',
    height: 4,
  },
  body: {
    padding: 32,
    flex: 1,
  },
  badge: {
    backgroundColor: '#C8973A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 18,
    color: '#1A3C6E',
    fontWeight: 'bold',
  },
  sectionValueSmall: {
    fontSize: 13,
    color: '#1A202C',
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
  },
  gridItem: {
    flex: 1,
    marginRight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  participantsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
  },
  participantsTitle: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  participantLabel: {
    fontSize: 10,
    color: '#374151',
  },
  participantValue: {
    fontSize: 10,
    color: '#1A3C6E',
    fontWeight: 'bold',
  },
  conditionsBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 6,
    padding: 14,
    borderLeft: '3px solid #C8973A',
    marginTop: 8,
  },
  conditionsTitle: {
    fontSize: 9,
    color: '#92400E',
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  conditionsText: {
    fontSize: 8,
    color: '#78350F',
    lineHeight: 1.6,
  },
  confidential: {
    position: 'absolute',
    top: '45%',
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 48,
    color: 'rgba(200, 151, 58, 0.07)',
    fontWeight: 'bold',
    transform: 'rotate(-30deg)',
    letterSpacing: 4,
  },
  footer: {
    backgroundColor: '#1A3C6E',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
  },
  footerBrand: {
    color: '#C8973A',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
})

export function VoucherSejourPDF({
  prospectNom,
  prospectPrenom,
  dateArrivee,
  dateDepart,
  nbAdultes,
  nbEnfantsPlus6,
  nbEnfantsMoins6,
  uniteReference,
  uniteType,
  apporteurNom,
  apporteurPrenom,
}: VoucherSejourPDFProps) {
  const totalPersonnes = nbAdultes + nbEnfantsPlus6 + nbEnfantsMoins6
  const typeLabel = LOT_TYPE_LABELS[uniteType] ?? uniteType

  return (
    <Document
      title={`Voucher Séjour Azembay — ${prospectPrenom} ${prospectNom}`}
      author="Azembay"
      subject="Invitation Séjour Exclusif — The Owners' Club — CONFIDENTIEL"
    >
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.confidential}>CONFIDENTIEL</Text>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AZEMBAY</Text>
          <Text style={styles.headerSubtitle}>RIPT 1 — SIDI BOU NAIM, MAROC — THE OWNERS' CLUB</Text>
        </View>

        {/* Gold band */}
        <View style={styles.goldBand} />

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>INVITATION SÉJOUR EXCLUSIF</Text>
          </View>

          {/* Invité */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invité(e)</Text>
            <Text style={styles.sectionValue}>{prospectPrenom} {prospectNom}</Text>
          </View>

          <View style={styles.divider} />

          {/* Dates */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Arrivée</Text>
              <Text style={styles.sectionValueSmall}>{dateArrivee} — à partir de 17h00</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Départ</Text>
              <Text style={styles.sectionValueSmall}>{dateDepart}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Unité */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Unité assignée</Text>
              <Text style={styles.sectionValueSmall}>{uniteReference}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Type d'hébergement</Text>
              <Text style={styles.sectionValueSmall}>{typeLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Participants */}
          <View style={styles.participantsBox}>
            <Text style={styles.participantsTitle}>Composition du groupe — {totalPersonnes} personne(s)</Text>
            <View style={styles.participantRow}>
              <Text style={styles.participantLabel}>Adultes</Text>
              <Text style={styles.participantValue}>{nbAdultes}</Text>
            </View>
            {nbEnfantsPlus6 > 0 && (
              <View style={styles.participantRow}>
                <Text style={styles.participantLabel}>Enfants de plus de 6 ans</Text>
                <Text style={styles.participantValue}>{nbEnfantsPlus6}</Text>
              </View>
            )}
            {nbEnfantsMoins6 > 0 && (
              <View style={styles.participantRow}>
                <Text style={styles.participantLabel}>Enfants de 6 ans et moins</Text>
                <Text style={styles.participantValue}>{nbEnfantsMoins6}</Text>
              </View>
            )}
          </View>

          {/* Apporteur */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Présenté par</Text>
            <Text style={{ fontSize: 11, color: '#374151' }}>{apporteurPrenom} {apporteurNom}</Text>
          </View>

          {/* Conditions */}
          <View style={styles.conditionsBox}>
            <Text style={styles.conditionsTitle}>Conditions de participation</Text>
            <Text style={styles.conditionsText}>
              {'• Ce séjour test est offert dans le cadre d\'une démarche d\'acquisition immobilière à Azembay — RIPT 1.\n'}
              {'• Il est strictement réservé au titulaire et aux personnes figurant sur ce voucher.\n'}
              {'• En cas de non-présentation (no-show) ou d\'annulation moins de 72h avant l\'arrivée, une facture sera émise.\n'}
              {'• Un avoir du même montant sera accordé lors de la finalisation de votre acquisition dans les délais convenus.\n'}
              {'• Présentation d\'une pièce d\'identité obligatoire à l\'arrivée.\n'}
              {'• Pension complète incluse. Consommations personnelles et extras non compris.'}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>CONFIDENTIEL — Document réservé au titulaire</Text>
          <Text style={styles.footerBrand}>AZEMBAY</Text>
          <Text style={styles.footerText}>Sidi Bou Naim, Maroc</Text>
        </View>
      </Page>
    </Document>
  )
}
