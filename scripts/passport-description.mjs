export const passportVoices = {
  Shooter:['Steely','Deadeye'],
  'Role-playing (RPG)':['Spellbound','Lorekeeper'],
  Platform:['Skybound','Daredevil'],
  Puzzle:['Enigmatic','Riddlekeeper'],
  Strategy:['Methodical','Mastermind'],
  'Real Time Strategy (RTS)':['Quick-witted','Commander'],
  'Turn-based strategy (TBS)':['Far-sighted','Tactician'],
  Tactical:['Surgical','Schemer'],
  Racing:['Full-throttle','Speedster'],
  Simulator:['Inventive','Worldsmith'],
  Fighting:['Unyielding','Challenger'],
  Indie:['Offbeat','Trailblazer'],
  Arcade:['Relentless','Scorechaser'],
  Sport:['Competitive','Champion'],
  Music:['Rhythmic','Virtuoso'],
  'Point-and-click':['Inquisitive','Sleuth'],
  'Hack and slash/Beat ’em up':['Untamed','Brawler'],
  'Hack and slash/Beat em up':['Untamed','Brawler'],
  'Visual Novel':['Dreamwoven','Storyweaver'],
  'Card & Board Game':['Wildcard','Gambiteer'],
  MOBA:['Team-minded','Playmaker'],
  Pinball:['Ricocheting','Wizard'],
  Quiz:['Erudite','Savant']
};
export function passportDescription(genres, playedCount) {
  const beloved=genres.filter(g=>g.name.toLowerCase()!=='adventure'&&g.count>=playedCount*.1&&g.ratedCount>0&&Number.isFinite(g.rating))
    .sort((a,b)=>b.rating-a.rating||b.count-a.count||a.name.localeCompare(b.name)).slice(0,2);
  if(!beloved.length)return {text:'An unwritten legend',detail:'Rate games to discover your beloved genres. Each genre needs at least 10% of your played games. Adventure is excluded.'};
  const voice=g=>passportVoices[g.name]||['Eclectic','Wayfarer'];
  return {
    text:voice(beloved[0])[0]+' '+voice(beloved[1]||beloved[0])[1],
    detail:(beloved.length===2?'Top beloved genres: ':'Beloved genre: ')+beloved.map(g=>g.name).join(' + ')+'. Ranked by your average rating; each needs at least 10% of your played games. Adventure is excluded.'
  };
}
