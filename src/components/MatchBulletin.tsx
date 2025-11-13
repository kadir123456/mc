import React, { useState, useEffect } from 'react';
import { Search, Filter, Lock, CheckCircle2, Calendar } from 'lucide-react';
import { matchService, Match } from '../services/matchService';

interface MatchBulletinProps {
  onMatchSelect: (matches: Match[]) => void;
  maxSelections: number;
  selectedMatches: Match[];
}

export const MatchBulletin: React.FC<MatchBulletinProps> = ({
  onMatchSelect,
  maxSelections,
  selectedMatches
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('all');

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    filterMatches();
  }, [matches, searchTerm, selectedLeague]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const upcomingMatches = await matchService.getAllUpcomingMatches();
      setMatches(upcomingMatches);
    } catch (error) {
      console.error('Maç yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMatches = () => {
    let filtered = [...matches];

    if (searchTerm) {
      filtered = filtered.filter(match =>
        match.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.league.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedLeague !== 'all') {
      filtered = filtered.filter(match =>
        match.league.toLowerCase().includes(selectedLeague.toLowerCase())
      );
    }

    setFilteredMatches(filtered);
  };

  const toggleMatchSelection = (match: Match) => {
    const isSelected = selectedMatches.some(m => m.fixtureId === match.fixtureId);

    if (isSelected) {
      onMatchSelect(selectedMatches.filter(m => m.fixtureId !== match.fixtureId));
    } else {
      if (selectedMatches.length < maxSelections) {
        onMatchSelect([...selectedMatches, match]);
      }
    }
  };

  const leagues = Array.from(new Set(matches.map(m => m.league)));

  const groupMatchesByDate = (matches: Match[]) => {
    const grouped: { [date: string]: Match[] } = {};
    matches.forEach(match => {
      if (!grouped[match.date]) {
        grouped[match.date] = [];
      }
      grouped[match.date].push(match);
    });
    return grouped;
  };

  const groupedMatches = groupMatchesByDate(filteredMatches);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-slate-300">Maçlar yükleniyor...</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-700/30 rounded-lg border border-slate-600">
        <Calendar className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <p className="text-slate-300 text-lg">Şu an için maç bulunmuyor</p>
        <p className="text-slate-500 text-sm mt-2">Yakında maçlar eklenecek</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Takım veya lig ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="all">Tüm Ligler</option>
            {leagues.map(league => (
              <option key={league} value={league}>{league}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-300 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Seçilen: {selectedMatches.length}/{maxSelections} maç
          {selectedMatches.length === maxSelections && ' - Analiz için hazır!'}
        </p>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedMatches).map(date => (
          <div key={date} className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Calendar className="w-5 h-5" />
              <span>{new Date(date).toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>

            <div className="space-y-2">
              {groupedMatches[date].map(match => {
                const isSelected = selectedMatches.some(m => m.fixtureId === match.fixtureId);
                const canSelect = selectedMatches.length < maxSelections || isSelected;

                return (
                  <button
                    key={match.fixtureId}
                    onClick={() => canSelect && toggleMatchSelection(match)}
                    disabled={!canSelect}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500'
                        : canSelect
                        ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                        : 'bg-slate-700/30 border-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                            {match.time}
                          </span>
                          <span className="text-xs text-blue-400">{match.league}</span>
                        </div>

                        <div className="text-white font-medium mb-1">
                          {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Lock className="w-3 h-3" />
                          <span>Analiz Gizli</span>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-6 h-6 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>Arama kriterlerine uygun maç bulunamadı</p>
        </div>
      )}
    </div>
  );
};
