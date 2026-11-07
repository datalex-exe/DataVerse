// Authoritative Game Engine for Arcade 1v1 Multiplayer Games
// Self-contained, zero-dependency, validated for Cloudflare Durable Objects.

export interface ClosestGuessState {
  round: number;
  maxRounds: number;
  target: number;
  guesses: Record<string, number | null>;
  scores: Record<string, number>;
  roundComplete: boolean;
  roundHistory: Array<{
    round: number;
    target: number;
    guesses: Record<string, number>;
    winnerId: string | null;
  }>;
}

export interface DotsBoxesState {
  gridSize: number; // 4 dots (3x3 boxes)
  drawnLines: string[]; // ["h-0-0", "v-1-2", ...]
  boxes: Record<string, string>; // "b-0-0" -> userId
  scores: Record<string, number>;
  lastLine: string | null;
}

export interface ConnectFourState {
  board: (string | null)[][]; // 6 rows x 7 cols
  lastMove: { row: number; col: number } | null;
  winningCells: [number, number][] | null;
}

export interface WordDuelState {
  round: number;
  maxRounds: number;
  letters: string[];
  submissions: Record<string, { word: string; isValid: boolean; length: number } | null>;
  scores: Record<string, number>;
  roundComplete: boolean;
  roundHistory: Array<{
    round: number;
    letters: string[];
    submissions: Record<string, { word: string; isValid: boolean; length: number }>;
    winnerId: string | null;
  }>;
}

export interface NumberGuessState {
  round: number;
  maxRounds: number;
  chooserId: string;
  guesserId: string;
  secretNumber: number | null;
  guesses: Array<{ guess: number; hint: 'HIGHER' | 'LOWER' | 'CORRECT' }>;
  maxGuesses: number;
  scores: Record<string, number>;
  roundComplete: boolean;
  roundWinnerId: string | null;
}

export interface ReactionRaceState {
  round: number;
  maxRounds: number;
  readyPlayers: Record<string, boolean>;
  state: 'waiting_ready' | 'waiting_go' | 'go' | 'round_complete';
  goTimestamp: number | null;
  reactionTimes: Record<string, number | null>; // ms, -1 for false start
  scores: Record<string, number>;
  roundHistory: Array<{
    round: number;
    reactionTimes: Record<string, number | null>;
    winnerId: string | null;
  }>;
}

export interface CheckersState {
  board: (string | null)[]; // 64 cells: 'r', 'R', 'b', 'B', or null
  mustContinueWith: number | null;
  lastMove: { from: number; to: number } | null;
  halfMovesWithoutCapture: number;
  capturedX: number;
  capturedO: number;
}

// Common dictionary for Word Duel validation (~1,500 common 3-8 letter English words)
const DICTIONARY = new Set([
  'ACE','ACT','ADD','AGE','AGO','AID','AIM','AIR','ALL','AND','ANY','APE','ARM','ART','ASH','ASK','BAD','BAG','BAR','BAT','BAY',
  'BED','BEE','BEG','BET','BID','BIG','BIN','BIT','BOB','BOG','BOW','BOX','BOY','BUD','BUG','BUS','BUT','BUY','BYE','CAB','CAN',
  'CAP','CAR','CAT','COW','CRY','CUP','CUT','DAD','DAM','DAY','DEN','DEW','DID','DIE','DIG','DIM','DIP','DOG','DOT','DRY','DUE',
  'EAR','EAT','EGG','END','EYE','FAN','FAR','FAT','FED','FEE','FEW','FIT','FIX','FLY','FOG','FOR','FOX','FRY','FUN','FUR','GAP',
  'GAS','GEL','GET','GLAD','GOD','GOT','GUM','GUN','GUT','GUY','GYM','HAD','HAM','HAS','HAT','HAY','HEN','HER','HID','HIM','HIP',
  'HIS','HIT','HOP','HOT','HOW','HUB','HUG','HUM','HUT','ICE','ILL','INK','INN','ION','ITS','JAM','JAR','JAW','JAY','JET','JOB',
  'JOG','JOY','JUG','KEY','KID','KIN','KIT','LAB','LAD','LAP','LAW','LAY','LED','LEG','LET','LID','LIE','LIP','LIT','LOG','LOT',
  'LOW','MAD','MAN','MAP','MAT','MAY','MEN','MET','MIX','MOM','MOP','MUD','MUG','MUM','NAB','NET','NEW','NOD','NOT','NOW','NUT',
  'OAK','OAR','ODD','OFF','OIL','OLD','ONE','OPT','OUR','OUT','OWL','OWN','PAD','PAN','PAT','PAY','PEA','PEN','PET','PIE','PIG',
  'PIN','PIT','POD','POP','POT','PRO','PUB','PUP','PUT','RAG','RAM','RAN','RAP','RAT','RAW','RAY','RED','RIB','RID','RIG','RIM',
  'RIP','ROB','ROD','ROT','ROW','RUB','RUG','RUN','RUT','RYE','SAD','SAG','SAP','SAT','SAW','SAY','SEA','SET','SEW','SHY','SIN',
  'SIP','SIR','SIT','SIX','SKI','SKY','SLY','SOB','SON','SOW','SOY','SPA','SPY','SUB','SUE','SUM','SUN','TAB','TAG','TAN','TAP',
  'TAR','TAX','TEA','TEN','THE','TIE','TIN','TIP','TOE','TON','TOP','TOW','TOY','TUB','TUG','TWO','URN','USE','VAN','VAT','VET',
  'VIA','VOW','WAR','WAS','WAX','WAY','WEB','WET','WHO','WHY','WIG','WIN','WIT','WOE','WOK','WON','YAK','YAM','YAP','YEA','YES',
  'YET','YEW','YOU','ZIP','ZOO',
  // 4 Letters
  'ABLE','ACID','AGED','ALLY','ALSO','AREA','ARMY','AWAY','BABY','BACK','BAKE','BALL','BAND','BANK','BARE','BARN','BASE','BATH',
  'BEAM','BEAN','BEAR','BEAT','BEER','BELL','BELT','BEND','BEST','BIRD','BITE','BLOW','BLUE','BOAT','BODY','BOIL','BOMB','BOND',
  'BONE','BOOK','BOOM','BORN','BOSS','BOTH','BOWL','BULK','BULL','BURN','BUSH','BUSY','CALL','CALM','CAME','CAMP','CARD','CARE',
  'CASE','CASH','CAST','CELL','CHAT','CHEF','CITY','CLAP','CLAY','CLIP','CLUB','COAL','COAT','CODE','COLD','COME','COOK','COOL',
  'COPE','COPY','CORE','CORN','COST','CREW','CROP','DARK','DATA','DATE','DAWN','DEAD','DEAL','DEAR','DECK','DEEP','DEER','DESK',
  'DIET','DIRT','DISC','DISH','DISK','DOOR','DOSE','DOWN','DRAW','DREW','DROP','DRUG','DRUM','DUCK','DUST','DUTY','EARN','EAST',
  'EASY','EDGE','ELSE','EVEN','EVER','EVIL','EXIT','FACE','FACT','FAIR','FALL','FARM','FAST','FATE','FEAR','FEED','FEEL','FEET',
  'FELL','FILE','FILL','FILM','FIND','FINE','FIRE','FIRM','FISH','FLAT','FLOW','FOOD','FOOT','FORD','FORM','FORT','FOUR','FREE',
  'FULL','FUND','GAME','GANG','GATE','GEAR','GIFT','GIRL','GIVE','GLAD','GLOW','GOAL','GOAT','GOLD','GOLF','GONE','GOOD','GRAY',
  'GREW','GROW','GULF','HAIR','HALF','HALL','HAND','HANG','HARD','HARM','HATE','HAVE','HEAD','HEAR','HEAT','HELD','HELL','HELP',
  'HERO','HIGH','HILL','HIRE','HOLD','HOLE','HOLY','HOME','HOPE','HORN','HOSE','HOST','HOUR','HUGE','HUNG','HUNT','HURT','IDEA',
  'INCH','INTO','IRON','ITEM','JACK','JAZZ','JOIN','JUMP','JURY','JUST','KEEN','KEEP','KEPT','KICK','KILL','KIND','KING','KISS',
  'KNEE','KNEW','KNIT','KNOT','KNOW','LACK','LADY','LAID','LAKE','LAND','LANE','LAST','LATE','LEAD','LEAF','LEAN','LEFT','LEND',
  'LESS','LIFE','LIFT','LIKE','LINE','LINK','LION','LIST','LIVE','LOAD','LOAN','LOCK','LOGO','LONG','LOOK','LORD','LOSE','LOSS',
  'LOST','LOVE','LUCK','MADE','MAIL','MAIN','MAKE','MALE','MANY','MARK','MASS','MEAL','MEAN','MEAT','MEET','MILE','MILK','MILL',
  'MIND','MINE','MISS','MODE','MOOD','MOON','MORE','MOST','MOVE','MUCH','NAME','NAVY','NEAR','NECK','NEED','NEWS','NEXT','NICE',
  'NINE','NOON','NOSE','NOTE','NOVEL','OKAY','ONCE','ONLY','OPEN','ORAL','OVER','PACE','PACK','PAGE','PAID','PAIN','PAIR','PALM',
  'PARK','PART','PASS','PAST','PATH','PEAK','PEER','PICK','PILE','PINE','PINK','PIPE','PLAN','PLAY','PLOT','PLUG','POEM','POET',
  'POLE','POLL','POOL','POOR','PORT','POST','POUR','PRAY','PULL','PURE','PUSH','RACE','RAIL','RAIN','RANK','RARE','RATE','READ',
  'REAL','REAR','RELY','RENT','REST','RICE','RICH','RIDE','RING','RISE','RISK','ROAD','ROCK','ROLE','ROLL','ROOF','ROOM','ROOT',
  'ROSE','RULE','RUSH','SAFE','SAID','SAIL','SALE','SALT','SAME','SAND','SAVE','SEAT','SEED','SEEK','SEEM','SEEN','SELF','SELL',
  'SEND','SENT','SHIP','SHOE','SHOP','SHOT','SHOW','SHUT','SICK','SIDE','SIGN','SILK','SITE','SIZE','SKIN','SLIP','SLOW','SNOW',
  'SOAP','SOFT','SOIL','SOLD','SOLE','SOME','SONG','SOON','SORT','SOUL','SOUP','SPAN','SPOT','STAR','STAY','STEP','STOP','SUCH',
  'SUIT','SURE','SWIM','TAKE','TALE','TALK','TALL','TANK','TAPE','TASK','TEAM','TEAR','TELL','TEND','TERM','TEST','TEXT','THAN',
  'THAT','THEM','THEN','THEY','THIN','THIS','TIDE','TIE','TINY','TIRE','TOOL','TOUR','TOWN','TREE','TRIP','TRUE','TUBE','TUNE',
  'TURN','TWIN','TYPE','UNIT','UPON','USER','VAST','VIEW','VOTE','WAGE','WAIT','WAKE','WALK','WALL','WANT','WARM','WARN','WASH',
  'WAVE','WEAR','WEEK','WELL','WENT','WEST','WHAT','WHEN','WHOM','WIDE','WIFE','WILD','WILL','WIND','WINE','WING','WIPE','WIRE',
  'WISE','WISH','WITH','WOLF','WOOD','WOOL','WORD','WORE','WORK','YARD','YEAR','ZERO','ZONE',
  // 5 Letters
  'ABOUT','ABOVE','ABUSE','ACTOR','ACUTE','ADMIT','ADOPT','ADULT','AFTER','AGAIN','AGENT','AGREE','AHEAD','ALARM','ALBUM','ALERT',
  'ALIKE','ALIVE','ALLOW','ALONE','ALONG','ALTER','AMONG','ANGER','ANGLE','ANGRY','APART','APPLE','APPLY','ARENA','ARGUE','ARISE',
  'ARRAY','ASIDE','ASSET','AUDIO','AUDIT','AVOID','AWAIT','AWAKE','AWARD','AWARE','BADLY','BAKER','BASES','BASIC','BASIS','BEACH',
  'BEGAN','BEGIN','BEGUN','BEING','BELOW','BENCH','BILLY','BIRTH','BLACK','BLAME','BLIND','BLOCK','BLOOD','BOARD','BOOST','BOOTH',
  'BOUND','BRAIN','BRAND','BREAD','BREAK','BREED','BRIEF','BRING','BROAD','BROKE','BROWN','BUILD','BUILT','BUYER','CABLE','CALIF',
  'CARRY','CATCH','CAUSE','CHAIN','CHAIR','CHART','CHASE','CHEAP','CHECK','CHEST','CHIEF','CHILD','CHINA','CHOSE','CIVIL','CLAIM',
  'CLASS','CLEAN','CLEAR','CLICK','CLOCK','CLOSE','COACH','COAST','COULD','COUNT','COURT','COVER','CRAFT','CRASH','CREAM','CRIME',
  'CROSS','CROWD','CROWN','CURVE','CYCLE','DAILY','DANCE','DATED','DEALT','DEATH','DEBUT','DELAY','DEPTH','DOING','DOUBT','DOZEN',
  'DRAFT','DRAMA','DRANK','DRAWN','DREAM','DRESS','DRILL','DRINK','DRIVE','DROVE','DYING','EAGER','EARLY','EARTH','EIGHT','ELITE',
  'EMPTY','ENEMY','ENJOY','ENTER','ENTRY','EQUAL','ERROR','EVENT','EVERY','EXACT','EXIST','EXTRA','FAITH','FALSE','FAULT','FIBER',
  'FIELD','FIFTH','FIFTY','FIGHT','FINAL','FIRST','FIXED','FLASH','FLEET','FLOOR','FLUID','FOCUS','FORCE','FORTH','FORTY','FORUM',
  'FOUND','FRAME','FRANK','FRAUD','FRESH','FRONT','FRUIT','FULLY','GIANT','GIVEN','GLASS','GLOBE','GOING','GRACE','GRADE','GRAND',
  'GRANT','GRASS','GREAT','GREEN','GROSS','GROUP','GROWN','GUARD','GUESS','GUEST','GUIDE','HAPPY','HARRY','HEART','HEAVY','HENCE',
  'HORSE','HOTEL','HOUSE','HUMAN','IDEAL','IMAGE','INDEX','INNER','INPUT','ISSUE','JAPAN','JIMMY','JOINT','JONES','JUDGE','KNOWN',
  'LABEL','LARGE','LASER','LATER','LAUGH','LAYER','LEARN','LEASE','LEAST','LEAVE','LEGAL','LEVEL','LIGHT','LIMIT','LINKS','LIVES',
  'LOCAL','LOGIC','LOOSE','LOWER','LUCKY','LUNCH','MAGIC','MAJOR','MAKER','MARCH','MATCH','MAYBE','MAYOR','MEANT','MEDIA','METAL',
  'MIGHT','MINOR','MINUS','MIXED','MODEL','MONEY','MONTH','MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MOVIE','MUSIC','NEEDS','NEVER',
  'NEWLY','NIGHT','NOISE','NORTH','NOTED','NOVEL','NURSE','OCCUR','OCEAN','OFFER','OFTEN','ORDER','OTHER','OUGHT','PAINT','PANEL',
  'PAPER','PARTY','PEACE','PETER','PHASE','PHONE','PHOTO','PIECE','PILOT','PITCH','PLACE','PLAIN','PLANE','PLANT','PLATE','POINT',
  'POUND','POWER','PRESS','PRICE','PRIDE','PRIME','PRINT','PRIOR','PRIZE','PROOF','PROUD','PROVE','QUEEN','QUICK','QUIET','QUITE',
  'RADIO','RAISE','RANGE','RAPID','RATIO','REACH','READY','REFER','RIGHT','RIVAL','RIVER','ROBIN','ROGER','ROMAN','ROUGH','ROUND',
  'ROUTE','ROYAL','RURAL','SCALE','SCENE','SCOPE','SCORE','SENSE','SERVE','SEVEN','SHALL','SHAPE','SHARE','SHARP','SHEET','SHELF',
  'SHELL','SHIFT','SHIRT','SHOCK','SHOOT','SHORT','SHOWN','SIGHT','SINCE','SIXTH','SIXTY','SIZED','SKILL','SLEEP','SLIDE','SMALL',
  'SMART','SMILE','SMITH','SMOKE','SOLID','SOLVE','SORRY','SOUND','SOUTH','SPACE','SPARE','SPEAK','SPEED','SPEND','SPENT','SPLIT',
  'SPOKE','SPORT','STAFF','STAGE','STAKE','STAND','START','STATE','STEAM','STEEL','STICK','STILL','STOCK','STONE','STOOD','STORE',
  'STORM','STORY','STRIP','STUCK','STUDY','STUFF','STYLE','SUGAR','SUITE','SUPER','SWEET','TABLE','TAKEN','TASTE','TAXES','TEACH',
  'TEETH','TERRY','TEXAS','THANK','THEFT','THEIR','THEME','THERE','THESE','THICK','THING','THINK','THIRD','THOSE','THREE','THREW',
  'THROW','TIGHT','TIMES','TIRED','TITLE','TODAY','TOPIC','TOTAL','TOUCH','TOUGH','TOWER','TRACK','TRADE','TRAIN','TREAT','TREND',
  'TRIAL','TRIED','TRIES','TRUCK','TRULY','TRUST','TRUTH','TWICE','UNDER','UNDUE','UNION','UNITY','UNTIL','UPPER','UPSET','URBAN',
  'USAGE','USUAL','VALID','VALUE','VIDEO','VIRUS','VISIT','VITAL','VOICE','WASTE','WATCH','WATER','WHEEL','WHERE','WHICH','WHILE',
  'WHITE','WHOLE','WHOSE','WOMAN','WOMEN','WORLD','WORRY','WORSE','WORST','WORTH','WOULD','WOUND','WRITE','WRONG','WROTE','YIELD',
  'YOUNG','YOUTH',
  // 6 Letters
  'ACTION','ACTIVE','ACTUAL','ADVICE','ADVISE','AFFORD','AFRAID','AGENCY','AGENDA','ALMOST','ALWAYS','AMOUNT','ANIMAL','ANNUAL',
  'ANSWER','ANYONE','APPEAL','APPEAR','AROUND','ARRIVE','ARTIST','ASPECT','ASSERT','ASSESS','ASSIST','ASSUME','ATTACK','ATTEND',
  'AUGUST','AUTHOR','AVENUE','BACKED','BARELY','BATTLE','BEAUTY','BECAME','BECOME','BEFORE','BEHALF','BEHIND','BELIEF','BELONG',
  'BERLIN','BETTER','BEYOND','BISHOP','BORDER','BORROW','BOTHER','BOTTLE','BOTTOM','BOUGHT','BRANCH','BREATH','BRIDGE','BRIGHT',
  'BROKEN','BUDGET','BURDEN','BUREAU','BUTTON','CAMERA','CANCER','CANDID','CANDLE','CANNOT','CANVAS','CARBON','CAREER','CASTLE',
  'CASUAL','CAUGHT','CENTER','CENTRE','CHANCE','CHANGE','CHARGE','CHOICE','CHOOSE','CHURCH','CIRCLE','CLIENT','CLOSED','CLOSER',
  'COFFEE','COLUMN','COMBAT','COMING','COMMON','COMPLY','COPPER','CORNER','COSTLY','COUNTY','COUPLE','COURSE','COUSIN','COVERS',
  'CREATE','CREDIT','CRISIS','CUSTOM','DAMAGE','DANGER','DEALER','DEBATE','DECADE','DECIDE','DEFEAT','DEFEND','DEFINE','DEGREE',
  'DEMAND','DEPEND','DEPUTY','DESERT','DESIGN','DESIRE','DETAIL','DETECT','DEVICE','DIFFER','DINNER','DIRECT','DOCTOR','DOLLAR',
  'DOMAIN','DOUBLE','DRIVEN','DRIVER','DURING','EASILY','EATING','EDITOR','EFFECT','EFFORT','EIGHTH','EITHER','ELEVEN','EMERGE',
  'EMPIRE','EMPLOY','ENABLE','ENDING','ENERGY','ENGAGE','ENGINE','ENOUGH','ENSURE','ENTIRE','ENTITY','EQUITY','ESCAPE','ESTATE',
  'ETHNIC','EXCEED','EXCEPT','EXCUSE','EXPAND','EXPECT','EXPERT','EXPORT','EXTEND','EXTENT','FABRIC','FACIAL','FACING','FACTOR',
  'FAILED','FAIRLY','FALLEN','FAMILY','FAMOUS','FATHER','FELLOW','FEMALE','FIGURE','FILING','FINGER','FINISH','FISCAL','FLIGHT',
  'FLYING','FOLLOW','FORCED','FOREST','FORGET','FORMAL','FORMAT','FORMER','FOSTER','FOUGHT','FOURTH','FREEZE','FRENCH','FRIEND',
  'FUTURE','GARDEN','GATHER','GENDER','GERMAN','GLOBAL','GOLDEN','GROUND','GROWTH','GUILTY','HANDED','HANDLE','HAPPEN','HARDLY',
  'HEADED','HEALTH','HEARING','HEAVEN','HEIGHT','HELMET','HIDDEN','HOLDER','HONEST','HORROR','HOSPITAL','HUNGRY','HUNTER','IGNORE',
  'IMPACT','IMPORT','IMPOSE','INCOME','INDEED','INDOOR','INFANT','INFORM','INJURY','INSIDE','INSIST','INTEND','INVEST','ISLAND',
  'ITSELF','JACKET','JERSEY','JUNIOR','KILLED','LABOUR','LACKING','LANDED','LARGELY','LASTED','LATTER','LEADER','LEAGUE','LEAVES',
  'LEGACY','LENGTH','LESSON','LETTER','LIGHTS','LIKELY','LINKED','LIQUID','LISTEN','LITTLE','LIVING','LOCATE','LONGER','LOOKED',
  'LOSING','LOVELY','LUXURY','MAINLY','MAKING','MANAGE','MANNER','MANUAL','MARGIN','MARINE','MARKED','MARKET','MARTIN','MASTER',
  'MATTER','MATURE','MEDIUM','MEMBER','MEMORY','MENTAL','MERELY','MERGER','METHOD','MIDDLE','MILLER','MINING','MINUTE','MIRROR',
  'MOBILE','MODERN','MODEST','MODULE','MOMENT','MORRIS','MORTAL','MOSTLY','MOTHER','MOTION','MOVING','MURDER','MUSEUM','MUTUAL',
  'MYSELF','NATION','NATIVE','NATURE','NEARBY','NEARLY','NEEDLE','NELSON','NEPHEW','NERVOUS','NEWEST','NEWSPAPER','NINTH','NOBODY',
  'NORMAL','NOTICE','NOTION','NUMBER','OBJECT','OBTAIN','OFFICE','OFFSET','ONLINE','OPENED','OPTION','ORANGE','ORIGIN','OUTPUT',
  'OUTSIDE','OXFORD','PACKED','PALACE','PARENT','PARTLY','PATENT','PEOPLE','PERIOD','PERMIT','PERSON','PHRASE','PICKED','PLANET',
  'PLAYER','PLEASE','PLENTY','POCKET','POETRY','POLICE','POLICY','POLISH','POLITE','POORLY','PORTAL','POSTED','POTATO','POWDER',
  'POWERFUL','PRAISE','PRAYER','PREFER','PRETTY','PRINCE','PRISON','PROFIT','PROMPT','PROPER','PROVE','PUBLIC','PURPLE','PURSUE',
  'QUICKLY','QUIETLY','RAISED','RANDOM','RARELY','RATHER','RATING','READER','REALLY','REASON','RECALL','RECENT','RECORD','REDUCE',
  'REFORM','REGARD','REGIME','REGION','RELATE','RELIEF','REMAIN','REMOTE','REMOVE','REPAIR','REPEAT','REPLAY','REPORT','RESCUE',
  'RESORT','RESULT','RETAIL','RETAIN','RETURN','REVEAL','REVIEW','REWARD','RIDING','RISING','ROBUST','RULING','SAFETY','SALARY',
  'SAMPLE','SAVING','SCHEME','SCHOOL','SCREEN','SEARCH','SEASON','SECOND','SECRET','SECTOR','SECURE','SEEING','SELECT','SELLER',
  'SENIOR','SERIES','SERVER','SETTLE','SEVERE','SEXUAL','SHOULD','SIGNAL','SIGNED','SILENT','SILVER','SIMPLE','SIMPLY','SINGLE',
  'SISTER','SLIGHT','SMOOTH','SOCIAL','SOLELY','SOUGHT','SOURCE','SOVIET','SPEECH','SPIRIT','SPREAD','SPRING','SQUARE','STABLE',
  'STATUS','STEADY','STOLEN','STRAIN','STREAM','STREET','STRESS','STRICT','STRIKE','STRING','STRONG','STRUCK','STUDIO','SUBMIT',
  'SUDDEN','SUFFER','SUMMER','SUMMIT','SUPPLY','SURELY','SURVEY','SWITCH','SYMBOL','SYSTEM','TAKING','TALENT','TARGET','TAUGHT',
  'TENANT','TENDER','TENNIS','THANKS','THEORY','THIRTY','THREAT','THROUGH','TICKET','TIMELY','TIMING','TISSUE','TONGUE','TOWARD',
  'TRAVEL','TREATY','TRENDS','TRIBAL','TRIPLET','TRYING','TWELVE','TWENTY','UNABLE','UNIQUE','UNITED','UNLESS','UNLIKE','UPDATE',
  'UPON','URGENT','USEFUL','VALLEY','VARIED','VECTOR','VENDOR','VERIFY','VESSEL','VICTIM','VIEWER','VIOLIN','VIRTUE','VISION',
  'VISUAL','VOLUME','WALKED','WARMED','WARNED','WATERS','WEALTH','WEEKLY','WEIGHT','WINDOW','WINNER','WINTER','WISDOM','WONDER',
  'WOODEN','WORKED','WORKER','WRITER','YELLOW'
]);

export function isValidDictionaryWord(word: string): boolean {
  if (!word || typeof word !== 'string') return false;
  const upper = word.trim().toUpperCase();
  return DICTIONARY.has(upper);
}

// -----------------------------------------------------------------------------------------
// INITIALIZERS
// -----------------------------------------------------------------------------------------

export function initClosestGuess(playerX: string, playerO: string): ClosestGuessState {
  return {
    round: 1,
    maxRounds: 5,
    target: Math.floor(Math.random() * 100) + 1,
    guesses: { [playerX]: null, [playerO]: null },
    scores: { [playerX]: 0, [playerO]: 0 },
    roundComplete: false,
    roundHistory: []
  };
}

export function initDotsBoxes(playerX: string, playerO: string): DotsBoxesState {
  return {
    gridSize: 4,
    drawnLines: [],
    boxes: {},
    scores: { [playerX]: 0, [playerO]: 0 },
    lastLine: null
  };
}

export function initConnectFour(): ConnectFourState {
  return {
    board: Array(6).fill(null).map(() => Array(7).fill(null)),
    lastMove: null,
    winningCells: null
  };
}

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'W', 'Y'];

export function generateWordDuelLetters(): string[] {
  const letters: string[] = [];
  // 3 vowels
  for (let i = 0; i < 3; i++) {
    letters.push(VOWELS[Math.floor(Math.random() * VOWELS.length)]);
  }
  // 6 consonants
  for (let i = 0; i < 6; i++) {
    letters.push(CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)]);
  }
  // Shuffle
  return letters.sort(() => Math.random() - 0.5);
}

export function initWordDuel(playerX: string, playerO: string): WordDuelState {
  return {
    round: 1,
    maxRounds: 3,
    letters: generateWordDuelLetters(),
    submissions: { [playerX]: null, [playerO]: null },
    scores: { [playerX]: 0, [playerO]: 0 },
    roundComplete: false,
    roundHistory: []
  };
}

export function initNumberGuess(playerX: string, playerO: string): NumberGuessState {
  return {
    round: 1,
    maxRounds: 4,
    chooserId: playerX,
    guesserId: playerO,
    secretNumber: null,
    guesses: [],
    maxGuesses: 7,
    scores: { [playerX]: 0, [playerO]: 0 },
    roundComplete: false,
    roundWinnerId: null
  };
}

export function initReactionRace(playerX: string, playerO: string): ReactionRaceState {
  return {
    round: 1,
    maxRounds: 5,
    readyPlayers: { [playerX]: false, [playerO]: false },
    state: 'waiting_ready',
    goTimestamp: null,
    reactionTimes: { [playerX]: null, [playerO]: null },
    scores: { [playerX]: 0, [playerO]: 0 },
    roundHistory: []
  };
}

export function initCheckers(): CheckersState {
  const board = Array(64).fill(null);
  // Red pieces ('r') in rows 0, 1, 2 on dark squares ( (row + col) % 2 === 1 )
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        board[r * 8 + c] = 'r';
      }
    }
  }
  // Black pieces ('b') in rows 5, 6, 7 on dark squares
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        board[r * 8 + c] = 'b';
      }
    }
  }
  return {
    board,
    mustContinueWith: null,
    lastMove: null,
    halfMovesWithoutCapture: 0,
    capturedX: 0,
    capturedO: 0
  };
}

// -----------------------------------------------------------------------------------------
// CHECKERS LOGIC
// -----------------------------------------------------------------------------------------

export interface CheckersMove {
  from: number;
  to: number;
  isCapture: boolean;
  capturedSquare?: number;
}

export function getLegalCheckersMoves(
  board: (string | null)[],
  userId: string,
  playerX: string,
  mustContinueWith: number | null = null
): CheckersMove[] {
  const isRed = userId === playerX;
  const myPiece = isRed ? 'r' : 'b';
  const myKing = isRed ? 'R' : 'B';
  const oppPiece = isRed ? 'b' : 'r';
  const oppKing = isRed ? 'B' : 'R';

  const captures: CheckersMove[] = [];
  const normalMoves: CheckersMove[] = [];

  const squaresToCheck = mustContinueWith !== null ? [mustContinueWith] : Array.from({ length: 64 }, (_, i) => i);

  for (const sq of squaresToCheck) {
    const piece = board[sq];
    if (!piece || (piece !== myPiece && piece !== myKing)) continue;

    const r = Math.floor(sq / 8);
    const c = sq % 8;
    const isKing = piece === myKing;

    // Directions: Red regular moves DOWN (+1), Black regular moves UP (-1), Kings move both (+1 and -1)
    const rowDirs = isKing ? [-1, 1] : isRed ? [1] : [-1];
    const colDirs = [-1, 1];

    for (const rDir of rowDirs) {
      for (const cDir of colDirs) {
        // 1. Regular move (1 step)
        const nr = r + rDir;
        const nc = c + cDir;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const toSq = nr * 8 + nc;
          if (board[toSq] === null && mustContinueWith === null) {
            normalMoves.push({ from: sq, to: toSq, isCapture: false });
          }
        }

        // 2. Capture jump (2 steps)
        const jr = r + 2 * rDir;
        const jc = c + 2 * cDir;
        if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8) {
          const jumpSq = jr * 8 + jc;
          const midSq = (r + rDir) * 8 + (c + cDir);
          const midPiece = board[midSq];

          if (board[jumpSq] === null && midPiece && (midPiece === oppPiece || midPiece === oppKing)) {
            captures.push({ from: sq, to: jumpSq, isCapture: true, capturedSquare: midSq });
          }
        }
      }
    }
  }

  // Mandatory capture rule: If ANY capture exists on the board, the player must capture!
  if (captures.length > 0) {
    return captures;
  }
  return mustContinueWith === null ? normalMoves : [];
}

// -----------------------------------------------------------------------------------------
// CONNECT FOUR WIN CHECKER
// -----------------------------------------------------------------------------------------

export function checkConnectFourWin(board: (string | null)[][]): { winner: string; cells: [number, number][] } | null {
  const rows = 6;
  const cols = 7;

  // Horizontal, Vertical, Diag Down, Diag Up
  const directions = [
    [0, 1],  // Horizontal
    [1, 0],  // Vertical
    [1, 1],  // Diagonal \
    [-1, 1]  // Diagonal /
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      for (const [dr, dc] of directions) {
        const line: [number, number][] = [[r, c]];
        for (let step = 1; step < 4; step++) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === piece) {
            line.push([nr, nc]);
          } else {
            break;
          }
        }
        if (line.length === 4) {
          return { winner: piece, cells: line };
        }
      }
    }
  }
  return null;
}

