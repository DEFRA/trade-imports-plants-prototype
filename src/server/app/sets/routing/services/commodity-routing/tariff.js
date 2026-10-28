/**
 * Commodity codes for live animals, germinal products, plants and plant
 * products, as the UK Trade Tariff publishes them.
 *
 * Source: the UK Trade Tariff API
 * (https://www.trade-tariff.service.gov.uk/api/v2/headings/<heading>), fetched
 * on 13 October 2026. Headings 0101 to 0106 (live animals), 0407 (fertilised
 * eggs for incubation only), 0511 (semen, ova and embryos only), 0601 to 0604
 * (live plants, bulbs, cut flowers and foliage), 0701 (potatoes), 1209 (seeds
 * for sowing), 4401 and 4403 (wood).
 *
 * Each row is one declarable 10-digit code and the tariff's own wording for
 * it, heading first, with the bare "Other" levels in between left out. The
 * list a row sits in is this release's own sorting of the code into the
 * routing group whose rules decide where it goes; the tariff does not publish
 * it.
 */
const LIVE_ANIMALS = [
  [
    '0101210000',
    'Live horses, asses, mules and hinnies: horses, pure-bred breeding animals'
  ],
  [
    '0101291000',
    'Live horses, asses, mules and hinnies: horses, for slaughter'
  ],
  ['0101299000', 'Live horses, asses, mules and hinnies: horses, other'],
  ['0101300000', 'Live horses, asses, mules and hinnies: asses'],
  ['0101900000', 'Live horses, asses, mules and hinnies: other'],
  [
    '0102211000',
    'Live bovine animals (cattle): cattle, pure-bred breeding animals, heifers (female bovines that have never calved)'
  ],
  [
    '0102213000',
    'Live bovine animals (cattle): cattle, pure-bred breeding animals, cows'
  ],
  [
    '0102219000',
    'Live bovine animals (cattle): cattle, pure-bred breeding animals, other'
  ],
  [
    '0102290500',
    'Live bovine animals (cattle): cattle, of the sub-genus bibos or of the sub-genus poephagus'
  ],
  [
    '0102291010',
    'Live bovine animals (cattle): cattle, of a weight not exceeding 80 kg, young male bovine animals, intended for fattening'
  ],
  [
    '0102291020',
    'Live bovine animals (cattle): cattle, of a weight not exceeding 80 kg, heifers of the grey, brown or yellow mountain breeds and spotted pinzgau breed, other than for slaughter'
  ],
  [
    '0102291030',
    'Live bovine animals (cattle): cattle, of a weight not exceeding 80 kg, heifers of the schwyz and fribourg breeds, other than for slaughter'
  ],
  [
    '0102291040',
    'Live bovine animals (cattle): cattle, of a weight not exceeding 80 kg, heifers of the spotted simmental breed, other than for slaughter'
  ],
  [
    '0102291050',
    'Live bovine animals (cattle): cattle, of a weight not exceeding 80 kg, bulls of the schwyz, fribourg and spotted simmental breeds, other than for slaughter'
  ],
  [
    '0102291090',
    'Live bovine animals (cattle): cattle, of a weight not exceeding 80 kg, other'
  ],
  [
    '0102292100',
    'Live bovine animals (cattle): cattle, of a weight exceeding 80 kg but not exceeding 160 kg, for slaughter'
  ],
  [
    '0102292910',
    'Live bovine animals (cattle): cattle, of a weight exceeding 80 kg but not exceeding 160 kg, young male bovine animals, intended for fattening'
  ],
  [
    '0102292920',
    'Live bovine animals (cattle): cattle, of a weight exceeding 80 kg but not exceeding 160 kg, heifers of the grey, brown or yellow mountain breeds and spotted pinzgau breed'
  ],
  [
    '0102292930',
    'Live bovine animals (cattle): cattle, of a weight exceeding 80 kg but not exceeding 160 kg, heifers of the schwyz and fribourg breeds'
  ],
  [
    '0102292940',
    'Live bovine animals (cattle): cattle, of a weight exceeding 80 kg but not exceeding 160 kg, heifers of the spotted simmental breed'
  ],
  [
    '0102292950',
    'Live bovine animals (cattle): cattle, of a weight exceeding 80 kg but not exceeding 160 kg, bulls of the schwyz, fribourg and spotted simmental breeds'
  ],
  [
    '0102292990',
    'Live bovine animals (cattle): cattle, of a weight exceeding 80 kg but not exceeding 160 kg, other'
  ],
  [
    '0102294100',
    'Live bovine animals (cattle): cattle, of a weight exceeding 160 kg but not exceeding 300 kg, for slaughter'
  ],
  [
    '0102294910',
    'Live bovine animals (cattle): cattle, of a weight exceeding 160 kg but not exceeding 300 kg, young male bovine animals, intended for fattening'
  ],
  [
    '0102294920',
    'Live bovine animals (cattle): cattle, of a weight exceeding 160 kg but not exceeding 300 kg, heifers and cows of the grey, brown or yellow mountain breeds and spotted pinzgau breed'
  ],
  [
    '0102294930',
    'Live bovine animals (cattle): cattle, of a weight exceeding 160 kg but not exceeding 300 kg, heifers and cows of the schwyz and fribourg breeds'
  ],
  [
    '0102294940',
    'Live bovine animals (cattle): cattle, of a weight exceeding 160 kg but not exceeding 300 kg, heifers and cows of the spotted simmental breed'
  ],
  [
    '0102294950',
    'Live bovine animals (cattle): cattle, of a weight exceeding 160 kg but not exceeding 300 kg, bulls of the schwyz, fribourg and spotted simmental breeds'
  ],
  [
    '0102294990',
    'Live bovine animals (cattle): cattle, of a weight exceeding 160 kg but not exceeding 300 kg, other'
  ],
  [
    '0102295110',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), for slaughter, not yet having any permanent teeth, of a weight of not less than 320 kg but not more than 470 kg'
  ],
  [
    '0102295190',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), for slaughter, other'
  ],
  [
    '0102295911',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), heifers of the grey, brown or yellow mountain breeds and spotted pinzgau breed, not yet having any permanent teeth, of a weight of not less than 320 kg but not more than 470 kg'
  ],
  [
    '0102295919',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), heifers of the grey, brown or yellow mountain breeds and spotted pinzgau breed, other'
  ],
  [
    '0102295921',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), of the schwyz and fribourg breeds, not yet having any permanent teeth, of a weight of not less than 320 kg but not more than 470 kg'
  ],
  [
    '0102295929',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), of the schwyz and fribourg breeds, other'
  ],
  [
    '0102295931',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), of the spotted simmental breed, not yet having any permanent teeth, of a weight of not less than 320 kg but not more than 470 kg'
  ],
  [
    '0102295939',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), of the spotted simmental breed, other'
  ],
  [
    '0102295991',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), not yet having any permanent teeth, of a weight of not less than 320 kg but not more than 470 kg'
  ],
  [
    '0102295999',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, heifers (female bovines that have never calved), other'
  ],
  [
    '0102296100',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, cows, for slaughter'
  ],
  [
    '0102296910',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, cows, heifers of the grey, brown or yellow mountain breeds and spotted pinzgau breed'
  ],
  [
    '0102296920',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, cows, of the schwyz and fribourg breeds'
  ],
  [
    '0102296930',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, cows, of the spotted simmental breed'
  ],
  [
    '0102296990',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, cows, other'
  ],
  [
    '0102299110',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, for slaughter, not yet having any permanent teeth, of a weight of not less than 350 kg but not more than 500 kg'
  ],
  [
    '0102299190',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, for slaughter, other'
  ],
  [
    '0102299921',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, bulls of the schwyz, fribourg and spotted simmental breeds, not yet having any permanent teeth, of a weight of not less than 350 kg but not more than 500 kg'
  ],
  [
    '0102299929',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, bulls of the schwyz, fribourg and spotted simmental breeds, other'
  ],
  [
    '0102299991',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, not yet having any permanent teeth, of a weight of not less than 350 kg but not more than 500 kg'
  ],
  [
    '0102299999',
    'Live bovine animals (cattle): cattle, of a weight exceeding 300 kg, other'
  ],
  [
    '0102310000',
    'Live bovine animals (cattle): buffalo, pure-bred breeding animals'
  ],
  [
    '0102391010',
    'Live bovine animals (cattle): buffalo, domestic species, of a weight exceeding 160 kg'
  ],
  [
    '0102391090',
    'Live bovine animals (cattle): buffalo, domestic species, other'
  ],
  ['0102399000', 'Live bovine animals (cattle): buffalo, other'],
  ['0102902000', 'Live bovine animals (cattle): pure-bred breeding animals'],
  [
    '0102909110',
    'Live bovine animals (cattle): domestic species, of a weight exceeding 160 kg'
  ],
  ['0102909190', 'Live bovine animals (cattle): domestic species, other'],
  ['0102909900', 'Live bovine animals (cattle): other'],
  ['0103100000', 'Live swine (pigs): pure-bred breeding animals'],
  [
    '0103911000',
    'Live swine (pigs): weighing less than 50 kg, domestic species'
  ],
  ['0103919000', 'Live swine (pigs): weighing less than 50 kg, other'],
  [
    '0103921100',
    'Live swine (pigs): weighing 50 kg or more, domestic species, sows having farrowed at least once, of a weight of not less than 160 kg'
  ],
  [
    '0103921900',
    'Live swine (pigs): weighing 50 kg or more, domestic species, other'
  ],
  ['0103929000', 'Live swine (pigs): weighing 50 kg or more, other'],
  ['0104101000', 'Live sheep and goats: sheep, pure-bred breeding animals'],
  ['0104103000', 'Live sheep and goats: sheep, lambs (up to a year old)'],
  ['0104108000', 'Live sheep and goats: sheep, other'],
  ['0104201000', 'Live sheep and goats: goats, pure-bred breeding animals'],
  ['0104209000', 'Live sheep and goats: goats, other'],
  [
    '0105111100',
    'Live poultry: weighing not more than 185 g, fowls of the species gallus domesticus, grandparent and parent female chicks, laying stocks'
  ],
  [
    '0105111900',
    'Live poultry: weighing not more than 185 g, fowls of the species gallus domesticus, grandparent and parent female chicks, other'
  ],
  [
    '0105119100',
    'Live poultry: weighing not more than 185 g, fowls of the species gallus domesticus, laying stocks'
  ],
  [
    '0105119900',
    'Live poultry: weighing not more than 185 g, fowls of the species gallus domesticus, other'
  ],
  ['0105120000', 'Live poultry: weighing not more than 185 g, turkeys'],
  ['0105130000', 'Live poultry: weighing not more than 185 g, ducks'],
  ['0105140000', 'Live poultry: weighing not more than 185 g, geese'],
  ['0105150000', 'Live poultry: weighing not more than 185 g, guinea fowls'],
  ['0105940000', 'Live poultry: fowls of the species gallus domesticus'],
  ['0105991000', 'Live poultry: ducks'],
  ['0105992000', 'Live poultry: geese'],
  ['0105993000', 'Live poultry: turkeys'],
  ['0105995000', 'Live poultry: guinea fowls'],
  ['0106110000', 'Other live animals: mammals, primates'],
  [
    '0106120000',
    'Other live animals: mammals, whales, dolphins and porpoises (mammals of the order cetacea); manatees and dugongs (mammals of the order sirenia); seals, sea lions and walruses (mammals of the suborder pinnipedia)'
  ],
  [
    '0106130000',
    'Other live animals: mammals, camels and other camelids (camelidae)'
  ],
  [
    '0106141000',
    'Other live animals: mammals, rabbits and hares, domestic rabbits'
  ],
  ['0106149000', 'Other live animals: mammals, rabbits and hares, other'],
  ['0106190000', 'Other live animals: mammals, other'],
  ['0106200000', 'Other live animals: reptiles (including snakes and turtles)'],
  ['0106310000', 'Other live animals: birds, birds of prey'],
  [
    '0106320000',
    'Other live animals: birds, psittaciformes (including parrots, parakeets, macaws and cockatoos)'
  ],
  [
    '0106330000',
    'Other live animals: birds, ostriches; emus (dromaius novaehollandiae)'
  ],
  ['0106391000', 'Other live animals: birds, pigeons'],
  ['0106398000', 'Other live animals: birds, other'],
  ['0106410000', 'Other live animals: insects, bees'],
  ['0106490000', 'Other live animals: insects, other'],
  ['0106900010', 'Other live animals: frogs, fit for human consumption'],
  ['0106900019', 'Other live animals: frogs, other'],
  ['0106900090', 'Other live animals: other']
]

const GERMINAL_PRODUCTS = [
  [
    '0407110000',
    'Birds’ eggs: fertilised eggs for incubation, of fowls of the species gallus domesticus'
  ],
  [
    '0407191100',
    'Birds’ eggs: fertilised eggs for incubation, of poultry, other than of fowls of the species gallus domesticus, of turkeys or geese'
  ],
  [
    '0407191900',
    'Birds’ eggs: fertilised eggs for incubation, of poultry, other than of fowls of the species gallus domesticus, other'
  ],
  ['0407199000', 'Birds’ eggs: fertilised eggs for incubation, other'],
  ['0511100000', 'Bovine semen'],
  ['0511998510', 'Mammalian semen'],
  ['0511998520', 'Mammalian ova and mammalian embryos']
]

const PLANTS_FOR_PLANTING = [
  [
    '0601101000',
    'Bulbs, tubers, corms and rhizomes: bulbs, tubers, tuberous roots, corms, crowns and rhizomes, dormant, hyacinths'
  ],
  [
    '0601102000',
    'Bulbs, tubers, corms and rhizomes: bulbs, tubers, tuberous roots, corms, crowns and rhizomes, dormant, narcissi'
  ],
  [
    '0601103000',
    'Bulbs, tubers, corms and rhizomes: bulbs, tubers, tuberous roots, corms, crowns and rhizomes, dormant, tulips'
  ],
  [
    '0601104000',
    'Bulbs, tubers, corms and rhizomes: bulbs, tubers, tuberous roots, corms, crowns and rhizomes, dormant, gladioli'
  ],
  [
    '0601109000',
    'Bulbs, tubers, corms and rhizomes: bulbs, tubers, tuberous roots, corms, crowns and rhizomes, dormant, other'
  ],
  [
    '0601201000',
    'Bulbs, tubers, corms and rhizomes: bulbs, tubers, tuberous roots, corms, crowns and rhizomes, in growth or in flower; chicory plants and roots, chicory plants and roots'
  ],
  [
    '0601203000',
    'Bulbs, tubers, corms and rhizomes: bulbs, tubers, tuberous roots, corms, crowns and rhizomes, in growth or in flower; chicory plants and roots, orchids, hyacinths, narcissi and tulips'
  ],
  [
    '0601209000',
    'Bulbs, tubers, corms and rhizomes: bulbs, tubers, tuberous roots, corms, crowns and rhizomes, in growth or in flower; chicory plants and roots, other'
  ],
  [
    '0602101000',
    'Live plants, cuttings and slips: unrooted cuttings and slips, of vines'
  ],
  [
    '0602109000',
    'Live plants, cuttings and slips: unrooted cuttings and slips, other'
  ],
  [
    '0602300010',
    'Live plants, cuttings and slips: rhododendrons and azaleas, grafted or not, rhododendrons'
  ],
  [
    '0602300090',
    'Live plants, cuttings and slips: rhododendrons and azaleas, grafted or not, azaleas'
  ],
  [
    '0602400010',
    'Live plants, cuttings and slips: roses, grafted or not, cuttings'
  ],
  [
    '0602400090',
    'Live plants, cuttings and slips: roses, grafted or not, other'
  ],
  ['0602901000', 'Live plants, cuttings and slips: mushroom spawn'],
  ['0602902000', 'Live plants, cuttings and slips: pineapple plants'],
  [
    '0602903000',
    'Live plants, cuttings and slips: vegetable and strawberry plants'
  ],
  [
    '0602905000',
    'Live plants, cuttings and slips: outdoor plants, other outdoor plants'
  ],
  [
    '0602907000',
    'Live plants, cuttings and slips: indoor plants, rooted cuttings and young plants, excluding cacti'
  ],
  [
    '0602909110',
    'Live plants, cuttings and slips: indoor plants, flowering plants with buds or flowers, excluding cacti, potted plants not exceeding 1 m in height'
  ],
  [
    '0602909190',
    'Live plants, cuttings and slips: indoor plants, flowering plants with buds or flowers, excluding cacti, other'
  ],
  [
    '0602909910',
    'Live plants, cuttings and slips: indoor plants, potted plants not exceeding 1 m in height'
  ],
  ['0602909990', 'Live plants, cuttings and slips: indoor plants, other']
]

const TREES_FOR_PLANTING = [
  [
    '0602201000',
    'Live plants, cuttings and slips: trees, shrubs and bushes, grafted or not, of kinds which bear edible fruit or nuts, vine slips, grafted or rooted'
  ],
  [
    '0602202000',
    'Live plants, cuttings and slips: trees, shrubs and bushes, grafted or not, of kinds which bear edible fruit or nuts, with bare roots'
  ],
  [
    '0602203000',
    'Live plants, cuttings and slips: trees, shrubs and bushes, grafted or not, of kinds which bear edible fruit or nuts, citrus'
  ],
  [
    '0602208000',
    'Live plants, cuttings and slips: trees, shrubs and bushes, grafted or not, of kinds which bear edible fruit or nuts, other'
  ],
  [
    '0602904100',
    'Live plants, cuttings and slips: outdoor plants, trees, shrubs and bushes, forest trees'
  ],
  [
    '0602904500',
    'Live plants, cuttings and slips: outdoor plants, trees, shrubs and bushes, rooted cuttings and young plants'
  ],
  [
    '0602904600',
    'Live plants, cuttings and slips: outdoor plants, trees, shrubs and bushes, with bare roots'
  ],
  [
    '0602904700',
    'Live plants, cuttings and slips: outdoor plants, trees, shrubs and bushes, conifers and evergreens'
  ],
  [
    '0602904800',
    'Live plants, cuttings and slips: outdoor plants, trees, shrubs and bushes, other'
  ]
]

const CUT_FLOWERS_AND_FOLIAGE = [
  ['0603110000', 'Cut flowers and flower buds: fresh, roses'],
  ['0603120000', 'Cut flowers and flower buds: fresh, carnations'],
  ['0603130000', 'Cut flowers and flower buds: fresh, orchids'],
  ['0603140000', 'Cut flowers and flower buds: fresh, chrysanthemums'],
  ['0603150000', 'Cut flowers and flower buds: fresh, lilies (lilium spp.)'],
  ['0603191000', 'Cut flowers and flower buds: fresh, gladioli'],
  ['0603192000', 'Cut flowers and flower buds: fresh, ranunculi'],
  ['0603197010', 'Cut flowers and flower buds: fresh, of the genus protea'],
  [
    '0603197020',
    'Cut flowers and flower buds: fresh, of the genus banksia, leucadendron, brunia and forsythia'
  ],
  ['0603197090', 'Cut flowers and flower buds: fresh, other'],
  ['0603900000', 'Cut flowers and flower buds: other'],
  [
    '0604201100',
    'Foliage, branches and other parts of plants: fresh, mosses and lichens, reindeer moss'
  ],
  [
    '0604201900',
    'Foliage, branches and other parts of plants: fresh, mosses and lichens, other'
  ],
  [
    '0604202000',
    'Foliage, branches and other parts of plants: fresh, christmas trees'
  ],
  [
    '0604204000',
    'Foliage, branches and other parts of plants: fresh, conifer branches'
  ],
  ['0604209000', 'Foliage, branches and other parts of plants: fresh, other'],
  [
    '0604901100',
    'Foliage, branches and other parts of plants: mosses and lichens, reindeer moss'
  ],
  [
    '0604901900',
    'Foliage, branches and other parts of plants: mosses and lichens, other'
  ],
  [
    '0604909100',
    'Foliage, branches and other parts of plants: not further prepared than dried'
  ],
  ['0604909900', 'Foliage, branches and other parts of plants: other']
]

const SEED_POTATOES = [['0701100000', 'Potatoes: seed']]

const WARE_POTATOES = [
  ['0701901000', 'Potatoes: for the manufacture of starch'],
  ['0701905000', 'Potatoes: new, from 1 january to 30 june'],
  ['0701909010', 'Potatoes: so-called "new", from 1 july to 31 december'],
  ['0701909090', 'Potatoes: other']
]

const SEEDS = [
  ['1209100000', 'Seeds for sowing: sugar beet seeds'],
  [
    '1209210000',
    'Seeds for sowing: seeds of forage plants, lucerne (alfalfa) seeds'
  ],
  [
    '1209221000',
    'Seeds for sowing: seeds of forage plants, clover (trifolium spp.) seeds, red clover (trifolium pratense l.)'
  ],
  [
    '1209228000',
    'Seeds for sowing: seeds of forage plants, clover (trifolium spp.) seeds, other'
  ],
  [
    '1209231100',
    'Seeds for sowing: seeds of forage plants, fescue seeds, meadow fescue (festuca pratensis huds.) seeds'
  ],
  [
    '1209231500',
    'Seeds for sowing: seeds of forage plants, fescue seeds, red fescue (festuca rubra l.) seeds'
  ],
  [
    '1209238000',
    'Seeds for sowing: seeds of forage plants, fescue seeds, other'
  ],
  [
    '1209240000',
    'Seeds for sowing: seeds of forage plants, kentucky blue grass (poa pratensis l.) seeds'
  ],
  [
    '1209251000',
    'Seeds for sowing: seeds of forage plants, ryegrass (lolium multiflorum lam., lolium perenne l.) seeds, italian ryegrass (including westerwolds) (lolium multiflorum lam.)'
  ],
  [
    '1209259000',
    'Seeds for sowing: seeds of forage plants, ryegrass (lolium multiflorum lam., lolium perenne l.) seeds, perennial ryegrass (lolium perenne l.)'
  ],
  [
    '1209294500',
    'Seeds for sowing: seeds of forage plants, timothy grass seed; vetch seed; seeds of the genus poa (poa palustris l., poa trivialis l.); cocksfoot grass (dactylis glomerata l.); bent grass (agrostis)'
  ],
  ['1209295000', 'Seeds for sowing: seeds of forage plants, lupine seed'],
  [
    '1209296000',
    'Seeds for sowing: seeds of forage plants, fodder beet seed (beta vulgaris var. alba)'
  ],
  ['1209298000', 'Seeds for sowing: seeds of forage plants, other'],
  [
    '1209300000',
    'Seeds for sowing: seeds of herbaceous plants cultivated principally for their flowers'
  ],
  [
    '1209913000',
    'Seeds for sowing: vegetable seeds, salad beet seed or beetroot seed (beta vulgaris var. conditiva)'
  ],
  ['1209918010', 'Seeds for sowing: vegetable seeds, seeds'],
  ['1209918090', 'Seeds for sowing: vegetable seeds, other'],
  ['1209991000', 'Seeds for sowing: forest-tree seeds'],
  [
    '1209999100',
    'Seeds for sowing: seeds of plants cultivated principally for their flowers, other than those of subheading 1209 30'
  ],
  ['1209999910', 'Seeds for sowing: seeds'],
  ['1209999990', 'Seeds for sowing: other']
]

const CONIFER_WOOD = [
  [
    '4401110000',
    'Fuel wood, wood chips, sawdust and wood waste: fuel wood, in logs, in billets, in twigs, in faggots or in similar forms, coniferous'
  ],
  [
    '4401210000',
    'Fuel wood, wood chips, sawdust and wood waste: wood in chips or particles, coniferous'
  ],
  [
    '4403110000',
    'Wood in the rough: treated with paint, stains, creosote or other preservatives, coniferous'
  ],
  [
    '4403211010',
    'Wood in the rough: other, coniferous, of pine (pinus spp.), of which the smallest cross-sectional dimension is 15 cm or more, sawlogs, exported from the russian federation in accordance with commission regulation no 498/2012'
  ],
  [
    '4403211090',
    'Wood in the rough: other, coniferous, of pine (pinus spp.), of which the smallest cross-sectional dimension is 15 cm or more, sawlogs, other'
  ],
  [
    '4403219010',
    'Wood in the rough: other, coniferous, of pine (pinus spp.), of which the smallest cross-sectional dimension is 15 cm or more, exported from the russian federation in accordance with commission regulation no 498/2012'
  ],
  [
    '4403219090',
    'Wood in the rough: other, coniferous, of pine (pinus spp.), of which the smallest cross-sectional dimension is 15 cm or more, other'
  ],
  [
    '4403220010',
    'Wood in the rough: other, coniferous, of pine (pinus spp.), other, exported from the russian federation in accordance with commission regulation no 498/2012'
  ],
  [
    '4403220090',
    'Wood in the rough: other, coniferous, of pine (pinus spp.), other, other'
  ],
  [
    '4403231010',
    'Wood in the rough: other, coniferous, of fir (abies spp.) and spruce (picea spp.), of which the smallest cross-sectional dimension is 15 cm or more, sawlogs, exported from the russian federation in accordance with commission regulation no 498/2012'
  ],
  [
    '4403231090',
    'Wood in the rough: other, coniferous, of fir (abies spp.) and spruce (picea spp.), of which the smallest cross-sectional dimension is 15 cm or more, sawlogs, other'
  ],
  [
    '4403239010',
    'Wood in the rough: other, coniferous, of fir (abies spp.) and spruce (picea spp.), of which the smallest cross-sectional dimension is 15 cm or more, exported from the russian federation in accordance with commission regulation no 498/2012'
  ],
  [
    '4403239090',
    'Wood in the rough: other, coniferous, of fir (abies spp.) and spruce (picea spp.), of which the smallest cross-sectional dimension is 15 cm or more, other'
  ],
  [
    '4403240010',
    'Wood in the rough: other, coniferous, of fir (abies spp.) and spruce (picea spp.), other, exported from the russian federation in accordance with commission regulation no 498/2012'
  ],
  [
    '4403240090',
    'Wood in the rough: other, coniferous, of fir (abies spp.) and spruce (picea spp.), other, other'
  ],
  [
    '4403251000',
    'Wood in the rough: other, coniferous, other, of which the smallest cross-sectional dimension is 15 cm or more, sawlogs'
  ],
  [
    '4403259000',
    'Wood in the rough: other, coniferous, other, of which the smallest cross-sectional dimension is 15 cm or more, other'
  ],
  ['4403260000', 'Wood in the rough: other, coniferous, other']
]

const HARDWOOD_CHIPS = [
  [
    '4401120000',
    'Fuel wood, wood chips, sawdust and wood waste: fuel wood, in logs, in billets, in twigs, in faggots or in similar forms, non-coniferous'
  ],
  [
    '4401221000',
    'Fuel wood, wood chips, sawdust and wood waste: wood in chips or particles, non-coniferous, of eucalyptus (eucalyptus spp.)'
  ],
  [
    '4401229000',
    'Fuel wood, wood chips, sawdust and wood waste: wood in chips or particles, non-coniferous, other'
  ],
  [
    '4401310000',
    'Fuel wood, wood chips, sawdust and wood waste: sawdust and wood waste and scrap, agglomerated in logs, briquettes, pellets or similar forms, wood pellets'
  ],
  [
    '4401320000',
    'Fuel wood, wood chips, sawdust and wood waste: sawdust and wood waste and scrap, agglomerated in logs, briquettes, pellets or similar forms, wood briquettes'
  ],
  [
    '4401390000',
    'Fuel wood, wood chips, sawdust and wood waste: sawdust and wood waste and scrap, agglomerated in logs, briquettes, pellets or similar forms, other'
  ],
  [
    '4401410000',
    'Fuel wood, wood chips, sawdust and wood waste: sawdust and wood waste and scrap, not agglomerated, sawdust'
  ],
  [
    '4401491000',
    'Fuel wood, wood chips, sawdust and wood waste: sawdust and wood waste and scrap, not agglomerated, bark and production waste, scrap, rejects and residues'
  ],
  [
    '4401499000',
    'Fuel wood, wood chips, sawdust and wood waste: sawdust and wood waste and scrap, not agglomerated, other'
  ]
]

const HARDWOOD_ROUND = [
  [
    '4403120000',
    'Wood in the rough: treated with paint, stains, creosote or other preservatives, non-coniferous'
  ],
  [
    '4403410000',
    'Wood in the rough: other, of tropical wood, dark red meranti, light red meranti and meranti bakau'
  ],
  ['4403420000', 'Wood in the rough: other, of tropical wood, teak'],
  [
    '4403491000',
    "Wood in the rough: other, of tropical wood, acajou d'afrique, iroko and sapelli"
  ],
  ['4403493500', 'Wood in the rough: other, of tropical wood, okoumé and sipo'],
  ['4403498500', 'Wood in the rough: other, of tropical wood, other'],
  ['4403910000', 'Wood in the rough: of oak (quercus spp.)'],
  [
    '4403930000',
    'Wood in the rough: of beech (fagus spp.), of which the smallest cross-sectional dimension is 15 cm or more'
  ],
  ['4403940000', 'Wood in the rough: of beech (fagus spp.), other'],
  [
    '4403951000',
    'Wood in the rough: of birch (betula spp.), of which the smallest cross-sectional dimension is 15 cm or more, sawlogs'
  ],
  [
    '4403959000',
    'Wood in the rough: of birch (betula spp.), of which the smallest cross-sectional dimension is 15 cm or more, other'
  ],
  ['4403960000', 'Wood in the rough: of birch (betula spp.), other'],
  ['4403970000', 'Wood in the rough: of poplar and aspen (populus spp.)'],
  ['4403980000', 'Wood in the rough: of eucalyptus (eucalyptus spp.)'],
  ['4403990000', 'Wood in the rough: other']
]

const BY_GROUP = [
  ['live-animals', LIVE_ANIMALS],
  ['germinal-products', GERMINAL_PRODUCTS],
  ['plants-for-planting', PLANTS_FOR_PLANTING],
  ['trees-for-planting', TREES_FOR_PLANTING],
  ['cut-flowers-and-foliage', CUT_FLOWERS_AND_FOLIAGE],
  ['seed-potatoes', SEED_POTATOES],
  ['ware-potatoes', WARE_POTATOES],
  ['seeds', SEEDS],
  ['conifer-wood', CONIFER_WOOD],
  ['hardwood-chips', HARDWOOD_CHIPS],
  ['hardwood-round', HARDWOOD_ROUND]
]

export const TARIFF_COMMODITIES = Object.freeze(
  BY_GROUP.flatMap(([group, rows]) =>
    rows.map(([code, name]) => Object.freeze({ code, name, group }))
  ).sort((a, b) => a.code.localeCompare(b.code))
)
