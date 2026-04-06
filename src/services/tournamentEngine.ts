/**
 * Tournament Engine - Dynamic bracket generation system
 * 
 * Handles:
 * - Auto-detection of optimal vs non-optimal team counts
 * - Within-group FIFA-style tiebreakers (h2h → GD → GF → global GD → global GF → wins)
 * - Cross-group average-based comparisons (avg pts/match → avg GF → avg GC)
 * - Automatic preliminary round generation when needed
 * - Deterministic, reproducible bracket creation
 */

export interface TeamStanding {
  eventTeamId: string;
  teamId: string;
  groupName: string;
  position: number; // 1-based position within group
  matchesPlayed: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  yellowCards: number;
  redCards: number;
  // Averages for cross-group comparison
  avgPointsPerMatch: number;
  avgGoalsForPerMatch: number;
  avgGoalsAgainstPerMatch: number;
  avgWinsPerMatch: number;
}

export interface BracketSlot {
  label: string; // e.g. "1º Grupo A", "1er Mejor 1º", "Ganador O1"
  teamId?: string; // resolved team ID if known
  eventTeamId?: string;
}

export interface GeneratedMatch {
  name: string; // O1, O2, C1, S1, F1...
  home: BracketSlot;
  away: BracketSlot;
  phase: string;
  round: string;
}

export interface BracketAnalysis {
  totalClassified: number;
  isOptimal: boolean; // true if direct bracket possible (8, 16, 32)
  startingRound: 'round_of_16' | 'round_of_8' | 'quarter_final' | 'semi_final' | 'final';
  startingRoundSize: number; // e.g. 8 for quarter_final means 8 teams, 4 matches
  directQualifiers: number; // teams that skip preliminary
  preliminaryNeeded: boolean;
  preliminaryMatchCount: number;
  preliminaryTeams: number; // teams in preliminary round
  summary: string;
}

export interface GroupMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  homeYellowCards: number;
  homeRedCards: number;
  awayYellowCards: number;
  awayRedCards: number;
  phase: string;
  groupName?: string;
  status: string;
}

// Valid bracket sizes (powers of 2)
const VALID_BRACKET_SIZES = [2, 4, 8, 16, 32];

function getRoundForSize(teamCount: number): BracketAnalysis['startingRound'] {
  if (teamCount <= 2) return 'final';
  if (teamCount <= 4) return 'semi_final';
  if (teamCount <= 8) return 'quarter_final';
  if (teamCount <= 16) return 'round_of_8';
  return 'round_of_16';
}

function getRoundPrefix(round: string): string {
  const prefixes: Record<string, string> = {
    'round_of_16': 'D',
    'round_of_8': 'O',
    'quarter_final': 'C',
    'semi_final': 'S',
    'final': 'F',
  };
  return prefixes[round] || 'P';
}

function getNextRound(round: string): string | null {
  const order = ['round_of_16', 'round_of_8', 'quarter_final', 'semi_final', 'final'];
  const idx = order.indexOf(round);
  if (idx === -1 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

/**
 * Analyze how many teams qualify and what bracket structure is needed
 */
export function analyzeBracket(
  numGroups: number,
  teamsPerGroup: number[],
  qualifyingPositions: number, // how many from each group qualify (e.g. top 2)
  additionalBestOf?: number, // e.g. "best 3rd places" count
): BracketAnalysis {
  const totalFromGroups = numGroups * qualifyingPositions;
  const totalClassified = totalFromGroups + (additionalBestOf || 0);

  // Find the target bracket size
  let targetSize = VALID_BRACKET_SIZES.find(s => s >= totalClassified) || 32;
  
  const isOptimal = VALID_BRACKET_SIZES.includes(totalClassified);
  
  if (isOptimal) {
    const startingRound = getRoundForSize(totalClassified);
    return {
      totalClassified,
      isOptimal: true,
      startingRound,
      startingRoundSize: totalClassified,
      directQualifiers: totalClassified,
      preliminaryNeeded: false,
      preliminaryMatchCount: 0,
      preliminaryTeams: 0,
      summary: `${totalClassified} equipos clasificados → cuadro directo desde ${getRoundLabel(startingRound)}`,
    };
  }

  // Non-optimal: need preliminary round to reduce to next valid bracket size
  const targetBracketSize = VALID_BRACKET_SIZES.find(s => s < totalClassified) || 
    VALID_BRACKET_SIZES[VALID_BRACKET_SIZES.length - 1];
  
  // How many spots are already filled (direct qualifiers)
  const directQualifiers = targetBracketSize; // teams that will be in the main bracket
  // Wait, let me reconsider...
  
  // We need to get DOWN to a power-of-2. 
  // E.g. 20 teams → target is 16 → 4 excess teams need to play preliminary
  // Actually: 20 teams, we want quarters (8 teams). 
  // Direct: best 4 firsts → quarters. Remaining 16 play in round_of_8.
  // But that's 8 matches in octavos, giving 8 teams for quarters... that's normal.
  
  // Better approach: find largest power of 2 ≤ totalClassified
  let largestPow2 = 2;
  for (const s of VALID_BRACKET_SIZES) {
    if (s <= totalClassified) largestPow2 = s;
  }
  
  const excess = totalClassified - largestPow2;
  const preliminaryMatchCount = excess; // each match eliminates 1
  const preliminaryTeams = excess * 2;
  const directQualifiersFinal = totalClassified - preliminaryTeams;
  
  const mainRound = getRoundForSize(largestPow2);
  
  return {
    totalClassified,
    isOptimal: false,
    startingRound: mainRound,
    startingRoundSize: largestPow2,
    directQualifiers: directQualifiersFinal,
    preliminaryNeeded: excess > 0,
    preliminaryMatchCount,
    preliminaryTeams,
    summary: `${totalClassified} equipos → ${directQualifiersFinal} pasan directos, ${preliminaryTeams} juegan ronda previa (${preliminaryMatchCount} partidos) → cuadro de ${largestPow2} desde ${getRoundLabel(mainRound)}`,
  };
}

function getRoundLabel(round: string): string {
  const labels: Record<string, string> = {
    'round_of_16': '1/16 de Final',
    'round_of_8': '1/8 de Final',
    'quarter_final': '1/4 de Final',
    'semi_final': 'Semifinales',
    'final': 'Final',
  };
  return labels[round] || round;
}

/**
 * Within-group tiebreaker (FIFA-style)
 * 1. Points from direct encounters
 * 2. Goal difference in direct encounters
 * 3. Goals scored in direct encounters
 * 4. Global goal difference
 * 5. Global goals scored
 * 6. Number of wins
 */
export function sortGroupStandings(
  teams: TeamStanding[],
  groupMatches: GroupMatch[],
): TeamStanding[] {
  const sorted = [...teams];
  
  // Multi-pass sort with h2h resolution
  sorted.sort((a, b) => {
    // 1. Total points
    if (b.points !== a.points) return b.points - a.points;
    
    // 2-3. Head-to-head between tied teams
    const h2h = getHeadToHeadComparison(a, b, groupMatches);
    if (h2h !== 0) return h2h;
    
    // 4. Global goal difference
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    
    // 5. Global goals scored
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    
    // 6. Number of wins
    if (b.wins !== a.wins) return b.wins - a.wins;
    
    return 0;
  });
  
  // Assign positions
  sorted.forEach((t, i) => { t.position = i + 1; });
  
  return sorted;
}

/**
 * Head-to-head comparison between two teams
 * Returns negative if a is better, positive if b is better, 0 if tied
 */
function getHeadToHeadComparison(
  a: TeamStanding,
  b: TeamStanding,
  groupMatches: GroupMatch[],
): number {
  const h2hMatches = groupMatches.filter(m =>
    (m.homeTeamId === a.teamId && m.awayTeamId === b.teamId) ||
    (m.homeTeamId === b.teamId && m.awayTeamId === a.teamId)
  );
  
  if (h2hMatches.length === 0) return 0;
  
  let aPts = 0, bPts = 0;
  let aGF = 0, aGA = 0, bGF = 0, bGA = 0;
  
  h2hMatches.forEach(m => {
    if (m.homeTeamId === a.teamId) {
      aGF += m.homeScore;
      aGA += m.awayScore;
      bGF += m.awayScore;
      bGA += m.homeScore;
      if (m.homeScore > m.awayScore) aPts += 3;
      else if (m.homeScore < m.awayScore) bPts += 3;
      else { aPts += 1; bPts += 1; }
    } else {
      bGF += m.homeScore;
      bGA += m.awayScore;
      aGF += m.awayScore;
      aGA += m.homeScore;
      if (m.homeScore > m.awayScore) bPts += 3;
      else if (m.homeScore < m.awayScore) aPts += 3;
      else { aPts += 1; bPts += 1; }
    }
  });
  
  // H2H criterion 1: Points in direct encounters
  if (aPts !== bPts) return bPts - aPts; // higher is better, so if b > a return positive (b before a... wait)
  // We want: return negative if a is better (a should come first)
  // sorted.sort((a, b) => ...) → negative means a comes first
  if (aPts !== bPts) return aPts > bPts ? -1 : 1;
  
  // H2H criterion 2: Goal difference in direct encounters
  const aH2hGD = aGF - aGA;
  const bH2hGD = bGF - bGA;
  if (aH2hGD !== bH2hGD) return aH2hGD > bH2hGD ? -1 : 1;
  
  // H2H criterion 3: Goals scored in direct encounters
  if (aGF !== bGF) return aGF > bGF ? -1 : 1;
  
  return 0;
}

/**
 * Cross-group comparison using AVERAGES per match
 * 1. Average points per match (higher is better)
 * 2. Goal difference total 
 * 3. Average goals scored per match (higher is better)
 * 4. Average goals conceded per match (lower is better)
 * 5. Average wins per match
 */
export function sortCrossGroupRanking(teams: TeamStanding[]): TeamStanding[] {
  return [...teams].sort((a, b) => {
    const aAvgPts = a.matchesPlayed > 0 ? a.points / a.matchesPlayed : 0;
    const bAvgPts = b.matchesPlayed > 0 ? b.points / b.matchesPlayed : 0;
    if (Math.abs(bAvgPts - aAvgPts) > 0.0001) return bAvgPts - aAvgPts;
    
    // Goal difference total
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    
    const aAvgGF = a.matchesPlayed > 0 ? a.goalsFor / a.matchesPlayed : 0;
    const bAvgGF = b.matchesPlayed > 0 ? b.goalsFor / b.matchesPlayed : 0;
    if (Math.abs(bAvgGF - aAvgGF) > 0.0001) return bAvgGF - aAvgGF;
    
    const aAvgGA = a.matchesPlayed > 0 ? a.goalsAgainst / a.matchesPlayed : 0;
    const bAvgGA = b.matchesPlayed > 0 ? b.goalsAgainst / b.matchesPlayed : 0;
    if (Math.abs(aAvgGA - bAvgGA) > 0.0001) return aAvgGA - bAvgGA; // lower is better
    
    const aAvgW = a.matchesPlayed > 0 ? a.wins / a.matchesPlayed : 0;
    const bAvgW = b.matchesPlayed > 0 ? b.wins / b.matchesPlayed : 0;
    if (Math.abs(bAvgW - aAvgW) > 0.0001) return bAvgW - aAvgW;
    
    return 0;
  });
}

/**
 * Build standings from raw match and team data
 */
export function buildGroupStandings(
  eventTeams: Array<{ id: string; team_id: string; group_name: string | null }>,
  matches: GroupMatch[],
): Map<string, TeamStanding[]> {
  // Group teams
  const groups = new Map<string, TeamStanding[]>();
  
  eventTeams.forEach(et => {
    const g = et.group_name || 'Sin grupo';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push({
      eventTeamId: et.id,
      teamId: et.team_id,
      groupName: g,
      position: 0,
      matchesPlayed: 0,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      yellowCards: 0,
      redCards: 0,
      avgPointsPerMatch: 0,
      avgGoalsForPerMatch: 0,
      avgGoalsAgainstPerMatch: 0,
      avgWinsPerMatch: 0,
    });
  });
  
  // Filter group-phase matches
  const groupMatches = matches.filter(m =>
    m.phase === 'group' || m.phase === 'Fase de Grupos' ||
    m.phase?.startsWith('Jornada') || m.phase?.toLowerCase().includes('grupo')
  );
  
  // Calculate stats
  groupMatches.forEach(m => {
    groups.forEach(teamsList => {
      const home = teamsList.find(t => t.teamId === m.homeTeamId);
      const away = teamsList.find(t => t.teamId === m.awayTeamId);
      if (!home || !away) return;
      
      home.matchesPlayed++;
      away.matchesPlayed++;
      home.goalsFor += m.homeScore;
      home.goalsAgainst += m.awayScore;
      away.goalsFor += m.awayScore;
      away.goalsAgainst += m.homeScore;
      home.yellowCards += m.homeYellowCards || 0;
      home.redCards += m.homeRedCards || 0;
      away.yellowCards += m.awayYellowCards || 0;
      away.redCards += m.awayRedCards || 0;
      
      if (m.homeScore > m.awayScore) {
        home.wins++; home.points += 3; away.losses++;
      } else if (m.homeScore < m.awayScore) {
        away.wins++; away.points += 3; home.losses++;
      } else {
        home.draws++; away.draws++;
        home.points += 1; away.points += 1;
      }
      
      home.goalDifference = home.goalsFor - home.goalsAgainst;
      away.goalDifference = away.goalsFor - away.goalsAgainst;
    });
  });
  
  // Calculate averages
  groups.forEach(teamsList => {
    teamsList.forEach(t => {
      if (t.matchesPlayed > 0) {
        t.avgPointsPerMatch = t.points / t.matchesPlayed;
        t.avgGoalsForPerMatch = t.goalsFor / t.matchesPlayed;
        t.avgGoalsAgainstPerMatch = t.goalsAgainst / t.matchesPlayed;
        t.avgWinsPerMatch = t.wins / t.matchesPlayed;
      }
    });
  });
  
  // Sort each group with h2h tiebreakers
  const sortedGroups = new Map<string, TeamStanding[]>();
  groups.forEach((teamsList, groupName) => {
    if (groupName === 'Sin grupo') {
      sortedGroups.set(groupName, teamsList);
      return;
    }
    const groupMatchesOnly = groupMatches.filter(m => {
      const homeInGroup = teamsList.some(t => t.teamId === m.homeTeamId);
      const awayInGroup = teamsList.some(t => t.teamId === m.awayTeamId);
      return homeInGroup && awayInGroup;
    });
    sortedGroups.set(groupName, sortGroupStandings(teamsList, groupMatchesOnly));
  });
  
  return sortedGroups;
}

/**
 * Build cross-group rankings by position
 * Returns: { 1: [best 1st, 2nd best 1st, ...], 2: [...], 3: [...] }
 */
export function buildCrossGroupRankings(
  standings: Map<string, TeamStanding[]>,
): Map<number, TeamStanding[]> {
  const rankings = new Map<number, TeamStanding[]>();
  
  standings.forEach((teamsList, groupName) => {
    if (groupName === 'Sin grupo') return;
    teamsList.forEach((team, idx) => {
      const pos = idx + 1;
      if (!rankings.has(pos)) rankings.set(pos, []);
      rankings.get(pos)!.push(team);
    });
  });
  
  // Sort each position group by cross-group criteria
  rankings.forEach((teams, pos) => {
    rankings.set(pos, sortCrossGroupRanking(teams));
  });
  
  return rankings;
}

/**
 * Determine the full bracket structure for a given number of classified teams
 */
export function determineBracketStructure(totalClassified: number): BracketAnalysis {
  if (totalClassified <= 1) {
    return {
      totalClassified,
      isOptimal: false,
      startingRound: 'final',
      startingRoundSize: 2,
      directQualifiers: totalClassified,
      preliminaryNeeded: false,
      preliminaryMatchCount: 0,
      preliminaryTeams: 0,
      summary: 'No hay suficientes equipos para eliminatorias',
    };
  }
  
  // Check if it's a perfect power of 2
  const isPow2 = VALID_BRACKET_SIZES.includes(totalClassified);
  
  if (isPow2) {
    const startingRound = getRoundForSize(totalClassified);
    return {
      totalClassified,
      isOptimal: true,
      startingRound,
      startingRoundSize: totalClassified,
      directQualifiers: totalClassified,
      preliminaryNeeded: false,
      preliminaryMatchCount: 0,
      preliminaryTeams: 0,
      summary: `${totalClassified} equipos → cuadro directo desde ${getRoundLabel(startingRound)}`,
    };
  }
  
  // Non-optimal: find largest power of 2 that fits
  let targetSize = 2;
  for (const s of VALID_BRACKET_SIZES) {
    if (s < totalClassified) targetSize = s;
  }
  
  const excess = totalClassified - targetSize;
  const preliminaryTeams = excess * 2;
  const directQualifiers = totalClassified - preliminaryTeams;
  const preliminaryMatchCount = excess;
  
  const startingRound = getRoundForSize(targetSize);
  
  return {
    totalClassified,
    isOptimal: false,
    startingRound,
    startingRoundSize: targetSize,
    directQualifiers,
    preliminaryNeeded: true,
    preliminaryMatchCount,
    preliminaryTeams,
    summary: `${totalClassified} equipos → ${directQualifiers} directos a ${getRoundLabel(startingRound)}, ${preliminaryTeams} en ronda previa (${preliminaryMatchCount} partidos)`,
  };
}

/**
 * Generate the full bracket matches deterministically
 * 
 * For non-optimal brackets (e.g. 20 teams → 16 bracket):
 * - Best ranked teams go direct to main round
 * - Lower ranked teams play preliminary
 * - Seeding: best vs worst principle
 */
export function generateBracketMatches(
  rankings: Map<number, TeamStanding[]>,
  analysis: BracketAnalysis,
  tier: string, // 'gold', 'silver', 'bronze'
): GeneratedMatch[] {
  const allTeamsRanked: TeamStanding[] = [];
  
  // Flatten rankings into a single ordered list (best to worst)
  // 1st places first (sorted by cross-group), then 2nd places, etc.
  const positions = Array.from(rankings.keys()).sort((a, b) => a - b);
  positions.forEach(pos => {
    const teams = rankings.get(pos)!;
    allTeamsRanked.push(...teams);
  });
  
  const totalTeams = Math.min(allTeamsRanked.length, analysis.totalClassified);
  const qualified = allTeamsRanked.slice(0, totalTeams);
  
  const matches: GeneratedMatch[] = [];
  const dbPhasePrefix = tier === 'gold' ? 'gold_' : tier === 'silver' ? 'silver_' : tier === 'bronze' ? 'bronze_' : '';
  
  if (analysis.isOptimal) {
    // Direct bracket - seed best vs worst
    const round = analysis.startingRound;
    const matchCount = totalTeams / 2;
    const prefix = getRoundPrefix(round);
    
    for (let i = 0; i < matchCount; i++) {
      const homeIdx = i;
      const awayIdx = totalTeams - 1 - i;
      
      matches.push({
        name: `${prefix}${i + 1}`,
        home: teamToSlot(qualified[homeIdx], rankings),
        away: teamToSlot(qualified[awayIdx], rankings),
        phase: `${dbPhasePrefix}${round}`,
        round,
      });
    }
  } else {
    // Non-optimal: preliminary round first
    const directCount = analysis.directQualifiers;
    const directTeams = qualified.slice(0, directCount);
    const prelimTeams = qualified.slice(directCount);
    
    // Generate preliminary matches (best prelim vs worst prelim)
    const prelimPrefix = 'P'; // Preliminary
    const prelimPhase = `${dbPhasePrefix}round_of_8`; // or appropriate
    
    // Actually, the preliminary round is BEFORE the starting round
    // We need to figure out what phase name to use
    const prelimRoundName = getPreliminaryRoundName(analysis.startingRound);
    
    for (let i = 0; i < analysis.preliminaryMatchCount; i++) {
      const homeIdx = i;
      const awayIdx = prelimTeams.length - 1 - i;
      
      matches.push({
        name: `${prelimPrefix}${i + 1}`,
        home: teamToSlot(prelimTeams[homeIdx], rankings),
        away: teamToSlot(prelimTeams[awayIdx], rankings),
        phase: `${dbPhasePrefix}${prelimRoundName}`,
        round: prelimRoundName,
      });
    }
    
    // Generate main round with direct qualifiers + preliminary winners
    const mainRound = analysis.startingRound;
    const mainPrefix = getRoundPrefix(mainRound);
    const mainMatchCount = analysis.startingRoundSize / 2;
    
    // Direct qualifiers fill slots, preliminary winners fill remaining
    // Seeding: direct qualifiers seeded 1-N, prelim winners fill bottom seeds
    let mainMatchIdx = 0;
    
    // Create paired slots: direct[0] vs Winner P[last], direct[1] vs Winner P[last-1], etc.
    // Actually simpler: first fill direct qualifiers paired against prelim winners
    // Then pair remaining directs against each other
    
    // If we have more directs than prelim winners, pair directs vs directs too
    const prelimWinnerSlots = analysis.preliminaryMatchCount;
    
    for (let i = 0; i < mainMatchCount; i++) {
      let home: BracketSlot;
      let away: BracketSlot;
      
      if (i < directCount && i < mainMatchCount) {
        home = teamToSlot(directTeams[i], rankings);
      } else {
        // This slot gets a preliminary winner
        const pIdx = i - directCount;
        home = { label: `Ganador P${pIdx + 1}` };
      }
      
      const awayMainIdx = mainMatchCount * 2 - 1 - i;
      if (awayMainIdx < directCount) {
        away = teamToSlot(directTeams[awayMainIdx], rankings);
      } else {
        const pIdx = awayMainIdx - directCount;
        if (pIdx < prelimWinnerSlots) {
          away = { label: `Ganador P${pIdx + 1}` };
        } else {
          away = { label: 'Por determinar' };
        }
      }
      
      matches.push({
        name: `${mainPrefix}${i + 1}`,
        home,
        away,
        phase: `${dbPhasePrefix}${mainRound}`,
        round: mainRound,
      });
      mainMatchIdx++;
    }
  }
  
  // Generate subsequent rounds (quarters → semis → final)
  let currentRound = analysis.preliminaryNeeded ? analysis.startingRound : analysis.startingRound;
  let currentMatchNames = matches
    .filter(m => m.round === currentRound)
    .map(m => m.name);
  
  let nextRound = getNextRound(currentRound);
  while (nextRound && currentMatchNames.length >= 2) {
    const nextPrefix = getRoundPrefix(nextRound);
    const nextMatchCount = Math.floor(currentMatchNames.length / 2);
    const nextNames: string[] = [];
    
    for (let i = 0; i < nextMatchCount; i++) {
      const name = `${nextPrefix}${i + 1}`;
      nextNames.push(name);
      matches.push({
        name,
        home: { label: `Ganador ${currentMatchNames[i * 2]}` },
        away: { label: `Ganador ${currentMatchNames[i * 2 + 1]}` },
        phase: `${dbPhasePrefix}${nextRound}`,
        round: nextRound,
      });
    }
    
    // Add third place match before final
    if (nextRound === 'final' && nextMatchCount === 1 && currentMatchNames.length === 2) {
      matches.push({
        name: `3P`,
        home: { label: `Perdedor ${currentMatchNames[0]}` },
        away: { label: `Perdedor ${currentMatchNames[1]}` },
        phase: `${dbPhasePrefix}third_place`,
        round: 'third_place',
      });
    }
    
    currentRound = nextRound;
    currentMatchNames = nextNames;
    nextRound = getNextRound(currentRound);
  }
  
  return matches;
}

function getPreliminaryRoundName(startingRound: string): string {
  // The preliminary round is one step before the starting round
  const order = ['round_of_16', 'round_of_8', 'quarter_final', 'semi_final', 'final'];
  const idx = order.indexOf(startingRound);
  if (idx > 0) return order[idx - 1];
  return 'round_of_16'; // fallback
}

function teamToSlot(team: TeamStanding, rankings: Map<number, TeamStanding[]>): BracketSlot {
  // Find position within their ranking group
  const positionTeams = rankings.get(team.position);
  let rankInPosition = 1;
  if (positionTeams) {
    const idx = positionTeams.findIndex(t => t.eventTeamId === team.eventTeamId);
    if (idx >= 0) rankInPosition = idx + 1;
  }
  
  // Generate label
  const ordinal = rankInPosition === 1 ? '1er' : `${rankInPosition}º`;
  const label = `${ordinal} Mejor ${team.position}º`;
  
  return {
    label,
    teamId: team.teamId,
    eventTeamId: team.eventTeamId,
  };
}

/**
 * Smart analysis: given actual group data, determine what bracket to generate
 */
export function analyzeFromGroups(
  standings: Map<string, TeamStanding[]>,
  qualifyingRules?: { positions: number; bestOf?: { position: number; count: number }[] },
): { analysis: BracketAnalysis; qualifiedTeams: TeamStanding[]; eliminatedTeams: TeamStanding[] } {
  const groupNames = Array.from(standings.keys()).filter(g => g !== 'Sin grupo').sort();
  const numGroups = groupNames.length;
  
  if (numGroups === 0) {
    return {
      analysis: determineBracketStructure(0),
      qualifiedTeams: [],
      eliminatedTeams: [],
    };
  }
  
  // Default: top 2 from each group + best 3rds if needed
  const positions = qualifyingRules?.positions || 2;
  
  // Get all teams by position across groups
  const rankings = buildCrossGroupRankings(standings);
  
  // Qualified: top N from each group
  const qualifiedTeams: TeamStanding[] = [];
  const eliminatedTeams: TeamStanding[] = [];
  
  groupNames.forEach(g => {
    const groupTeams = standings.get(g)!;
    groupTeams.forEach((t, idx) => {
      if (idx < positions) {
        qualifiedTeams.push(t);
      } else {
        eliminatedTeams.push(t);
      }
    });
  });
  
  // Add best of additional positions if specified
  if (qualifyingRules?.bestOf) {
    qualifyingRules.bestOf.forEach(rule => {
      const posTeams = rankings.get(rule.position);
      if (posTeams) {
        const toAdd = posTeams.slice(0, rule.count);
        toAdd.forEach(t => {
          if (!qualifiedTeams.some(q => q.eventTeamId === t.eventTeamId)) {
            qualifiedTeams.push(t);
            const elimIdx = eliminatedTeams.findIndex(e => e.eventTeamId === t.eventTeamId);
            if (elimIdx >= 0) eliminatedTeams.splice(elimIdx, 1);
          }
        });
      }
    });
  }
  
  const analysis = determineBracketStructure(qualifiedTeams.length);
  
  return { analysis, qualifiedTeams, eliminatedTeams };
}
