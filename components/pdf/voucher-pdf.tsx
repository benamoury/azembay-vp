'use client'

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

interface VoucherPDFProps {
  numeroVoucher: string
  prospectNom: string
  prospectPrenom: string
  dateVisite: string
  heureVisite: string
  apporteurNom: string
  apporteurPrenom: string
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
  headerNum: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    marginTop: 12,
    fontFamily: 'Helvetica',
  },
  body: {
    padding: 32,
    flex: 1,
  },
  goldBand: {
    backgroundColor: '#C8973A',
    height: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sectionValue: {
    fontSize: 18,
    color: '#1A3C6E',
    fontWeight: 'bold',
  },
  sectionValueSmall: {
    fontSize: 14,
    color: '#1A202C',
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    gap: 0,
  },
  gridItem: {
    flex: 1,
    marginRight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  infoBox: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 9,
    color: '#64748B',
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
  badge: {
    backgroundColor: '#C8973A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
})

export function VoucherPDF({
  numeroVoucher,
  prospectNom,
  prospectPrenom,
  dateVisite,
  heureVisite,
  apporteurNom,
  apporteurPrenom,
}: VoucherPDFProps) {
  return (
    <Document
      title={`Voucher Azembay — ${prospectPrenom} ${prospectNom}`}
      author="Azembay"
      subject="Voucher de visite — CONFIDENTIEL"
    >
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.confidential}>CONFIDENTIEL</Text>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AZEMBAY</Text>
          <Text style={styles.headerSubtitle}>RIPT 1 — SIDI BOU NAIM, MAROC — VENTE PRIVÉE OFF-MARKET</Text>
          <Text style={styles.headerNum}>Voucher N° {numeroVoucher}</Text>
        </View>

        {/* Gold band */}
        <View style={styles.goldBand} />

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>VOUCHER DE VISITE</Text>
          </View>

          {/* Prospect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visiteur</Text>
            <Text style={styles.sectionValue}>{prospectPrenom} {prospectNom}</Text>
          </View>

          <View style={styles.divider} />

          {/* Date + Heure */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Date de visite</Text>
              <Text style={styles.sectionValueSmall}>{dateVisite}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.sectionTitle}>Heure</Text>
              <Text style={styles.sectionValueSmall}>{heureVisite}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Apporteur */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Présenté par</Text>
            <Text style={styles.sectionValueSmall}>{apporteurPrenom} {apporteurNom}</Text>
          </View>

          {/* Instructions */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Ce voucher est nominatif et personnel. Présentez-le à votre arrivée sur le site Azembay accompagné d'une pièce d'identité.{'\n'}
              Toute reproduction est strictement interdite.
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
