import {test} from 'node:test';
import assert from 'node:assert/strict';
import {passportDescription} from '../scripts/passport-description.mjs';
const genre=(name,count,rating,ratedCount=count)=>({name,count,rating,ratedCount});
test('uses the top two beloved genres, ignoring play-count leader and Adventure',()=>{
  const result=passportDescription([genre('Adventure',100,5),genre('Shooter',60,3),genre('Role-playing (RPG)',30,4.5)],100);
  assert.equal(result.text,'Spellbound Deadeye');
  assert.match(result.detail,/Top beloved genres: Role-playing \(RPG\) \+ Shooter/);
  assert.equal(passportDescription([genre('Shooter',90,2),genre('Puzzle',40,5),genre('Strategy',20,4)],100).text,'Enigmatic Mastermind');
});
test('a shared favourite gets its own description',()=>{
  assert.equal(passportDescription([genre('Puzzle',60,5)],100).text,'Enigmatic Riddlekeeper');
});
test('beloved needs 10 percent coverage; unrated and Adventure-only libraries stay honest',()=>{
  assert.equal(passportDescription([genre('Shooter',60,4),genre('Puzzle',9,5)],100).text,'Steely Deadeye');
  assert.equal(passportDescription([genre('Shooter',60,NaN,0)],100).text,'An unwritten legend');
  assert.equal(passportDescription([genre('Adventure',100,5)],100).text,'An unwritten legend');
});
