import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Phone, ChevronRight, Search } from 'lucide-react';
import logoSeaco from '@/assets/logo-seaco-round.png';
import type { Releveur } from '@/types/water';

// Liste prédéfinie des releveurs SEACO
const RELEVEURS: Releveur[] = [
  { id: 'RLV001', nom: 'BENALI', prenom: 'Mohamed', matricule: 'RLV-2025-001', sectionsDisponibles: ['SG12', 'SG13'] },
  { id: 'RLV002', nom: 'BENSOUIKI', prenom: 'Abdelmadjid', matricule: 'RLV-2025-002', sectionsDisponibles: ['SG12'] },
  { id: 'RLV003', nom: 'ZEMMOULI', prenom: 'Abdelhamid', matricule: 'RLV-2025-003', sectionsDisponibles: ['SG13'] },
  { id: 'RLV004', nom: 'FERGANI', prenom: 'Ammar', matricule: 'RLV-2025-004', sectionsDisponibles: ['SG12', 'SG13'] },
  { id: 'RLV005', nom: 'BOUHADIDJI', prenom: 'Ramdane', matricule: 'RLV-2025-005', sectionsDisponibles: ['SG12'] },
  { id: 'RLV006', nom: 'HALIMI', prenom: 'Abdelwahab', matricule: 'RLV-2025-006', sectionsDisponibles: ['SG13'] },
  { id: 'RLV007', nom: 'KIAL', prenom: 'Khadra', matricule: 'RLV-2025-007', sectionsDisponibles: ['SG12', 'SG13'] },
  { id: 'RLV008', nom: 'MESSAOUDI', prenom: 'Djemoui', matricule: 'RLV-2025-008', sectionsDisponibles: ['SG12'] },
];

interface Props {
  onSelect: (releveur: Releveur, sectionGeo: string, mobile: string) => void;
}

export default function ReleveurSelectPage({ onSelect }: Props) {
  const [selectedReleveur, setSelectedReleveur] = useState<Releveur | null>(null);
  const [sectionGeo, setSectionGeo] = useState('');
  const [mobile, setMobile] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const filteredReleveurs = useMemo(() => {
    if (!search.trim()) return RELEVEURS;
    const q = search.toLowerCase();
    return RELEVEURS.filter(r =>
      r.nom.toLowerCase().includes(q) ||
      r.prenom.toLowerCase().includes(q) ||
      r.matricule.toLowerCase().includes(q)
    );
  }, [search]);

  const handleConfirm = () => {
    if (!selectedReleveur) {
      setError('Veuillez sélectionner un releveur');
      return;
    }
    if (!sectionGeo) {
      setError('Veuillez choisir une section géographique');
      return;
    }
    if (!mobile || mobile.length < 10) {
      setError('Veuillez saisir un numéro mobile valide (10 chiffres)');
      return;
    }
    onSelect(selectedReleveur, sectionGeo, mobile);
  };

  return (
    <div className="min-h-screen bg-gradient-hero p-4 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 max-w-sm mx-auto w-full"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6 pt-4">
          <img src={logoSeaco} alt="SEACO" className="h-16 w-16 rounded-full bg-card/20 backdrop-blur-sm object-cover shadow-elevated mb-3" />
          <h1 className="text-xl font-bold text-primary-foreground">Sélection du Releveur</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">Choisissez votre profil de tournée</p>
        </div>

        <div className="bg-card rounded-2xl shadow-modal p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un releveur..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Releveur List */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {filteredReleveurs.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedReleveur(r);
                  setSectionGeo(r.sectionsDisponibles[0] || '');
                  setError('');
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  selectedReleveur?.id === r.id
                    ? 'bg-primary/10 border-2 border-primary shadow-sm'
                    : 'bg-muted/30 border-2 border-transparent hover:bg-muted/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedReleveur?.id === r.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{r.nom} {r.prenom}</p>
                  <p className="text-xs text-muted-foreground">{r.matricule}</p>
                </div>
                <ChevronRight className={`h-4 w-4 transition-colors ${
                  selectedReleveur?.id === r.id ? 'text-primary' : 'text-muted-foreground/40'
                }`} />
              </button>
            ))}
            {filteredReleveurs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun releveur trouvé</p>
            )}
          </div>

          {/* Section Géographique */}
          {selectedReleveur && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1.5">
                  <MapPin className="h-4 w-4" /> Section géographique
                </label>
                <div className="flex gap-2">
                  {selectedReleveur.sectionsDisponibles.map(s => (
                    <button
                      key={s}
                      onClick={() => setSectionGeo(s)}
                      className={`flex-1 h-10 rounded-lg font-semibold text-sm transition-all ${
                        sectionGeo === s
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1.5">
                  <Phone className="h-4 w-4" /> Numéro mobile
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="0XX XX XX XX XX"
                  maxLength={10}
                  className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-center text-lg tracking-widest font-mono"
                />
              </div>
            </motion.div>
          )}

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <button
            onClick={handleConfirm}
            disabled={!selectedReleveur}
            className="w-full h-12 rounded-lg bg-gradient-primary text-primary-foreground font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            Valider et démarrer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
