/**
 * Verse of the day — scripture on money, stewardship, generosity, contentment,
 * and debt. Quotations follow the World English Bible (WEB), a modern
 * public-domain translation (OT quotes render the divine name as "the LORD",
 * as in the WEB British edition). Kept short so the banner stays a banner.
 */

export interface Verse {
  text: string
  reference: string
}

export const VERSES: Verse[] = [
  // Giving & generosity
  { text: 'Honor the LORD with your substance, with the first fruits of all your increase.', reference: 'Proverbs 3:9' },
  { text: 'There is one who scatters, and increases yet more. There is one who withholds more than is appropriate, but gains poverty.', reference: 'Proverbs 11:24' },
  { text: 'The liberal soul shall be made fat. He who waters shall be watered also himself.', reference: 'Proverbs 11:25' },
  { text: 'He who has pity on the poor lends to the LORD; he will reward him.', reference: 'Proverbs 19:17' },
  { text: 'He who has a generous eye will be blessed, for he shares his food with the poor.', reference: 'Proverbs 22:9' },
  { text: 'Bring the whole tithe into the storehouse… and test me now in this, says the LORD of Armies, if I will not open you the windows of heaven.', reference: 'Malachi 3:10' },
  { text: 'But when you do merciful deeds, don’t let your left hand know what your right hand does… and your Father who sees in secret will reward you.', reference: 'Matthew 6:3-4' },
  { text: 'Give, and it will be given to you: good measure, pressed down, shaken together, and running over.', reference: 'Luke 6:38' },
  { text: 'It is more blessed to give than to receive.', reference: 'Acts 20:35' },
  { text: 'He who sows sparingly will also reap sparingly. He who sows bountifully will also reap bountifully.', reference: '2 Corinthians 9:6' },
  { text: 'Let each man give according as he has determined in his heart, not grudgingly or under compulsion, for God loves a cheerful giver.', reference: '2 Corinthians 9:7' },
  { text: 'God is able to make all grace abound to you, that you, always having all sufficiency in everything, may abound to every good work.', reference: '2 Corinthians 9:8' },
  { text: 'Do good… be rich in good works… be ready to distribute, willing to share.', reference: '1 Timothy 6:18' },
  { text: 'All things come from you, and we have given you of your own.', reference: '1 Chronicles 29:14' },
  // Stewardship & diligence
  { text: 'The plans of the diligent surely lead to profit; and everyone who is hasty surely rushes to poverty.', reference: 'Proverbs 21:5' },
  { text: 'There is precious treasure and oil in the dwelling of the wise, but a foolish man swallows it up.', reference: 'Proverbs 21:20' },
  { text: 'Prepare your work outside, and get your fields ready. Afterwards, build your house.', reference: 'Proverbs 24:27' },
  { text: 'Know well the state of your flocks, and pay attention to your herds.', reference: 'Proverbs 27:23' },
  { text: 'Go to the ant, you sluggard. Consider her ways, and be wise.', reference: 'Proverbs 6:6' },
  { text: 'Wealth gained dishonestly dwindles away, but he who gathers by hand makes it grow.', reference: 'Proverbs 13:11' },
  { text: 'A faithful man is rich with blessings.', reference: 'Proverbs 28:20' },
  { text: 'For which of you, desiring to build a tower, doesn’t first sit down and count the cost?', reference: 'Luke 14:28' },
  { text: 'He who is faithful in a very little is faithful also in much.', reference: 'Luke 16:10' },
  { text: 'If you have not been faithful in the unrighteous mammon, who will commit to your trust the true riches?', reference: 'Luke 16:11' },
  { text: 'Well done, good and faithful servant. You have been faithful over a few things, I will set you over many things.', reference: 'Matthew 25:21' },
  { text: 'Whatever you do, work heartily, as for the Lord, and not for men.', reference: 'Colossians 3:23' },
  { text: 'The earth is the LORD’s, with its fullness; the world, and those who dwell in it.', reference: 'Psalm 24:1' },
  { text: 'You shall remember the LORD your God, for it is he who gives you power to get wealth.', reference: 'Deuteronomy 8:18' },
  // Contentment & trust
  { text: 'Better is little, with the fear of the LORD, than great treasure with trouble.', reference: 'Proverbs 15:16' },
  { text: 'Give me neither poverty nor riches. Feed me with the food that is needful for me.', reference: 'Proverbs 30:8' },
  { text: 'He who loves silver shall not be satisfied with silver, nor he who loves abundance, with increase.', reference: 'Ecclesiastes 5:10' },
  { text: 'Don’t lay up treasures for yourselves on the earth… for where your treasure is, there your heart will be also.', reference: 'Matthew 6:19-21' },
  { text: 'No one can serve two masters… You can’t serve both God and Mammon.', reference: 'Matthew 6:24' },
  { text: 'See the birds of the sky, that they don’t sow, neither do they reap… your heavenly Father feeds them. Aren’t you of much more value than they?', reference: 'Matthew 6:26' },
  { text: 'But seek first God’s Kingdom and his righteousness; and all these things will be given to you as well.', reference: 'Matthew 6:33' },
  { text: 'A man’s life doesn’t consist of the abundance of the things which he possesses.', reference: 'Luke 12:15' },
  { text: 'I have learned in whatever state I am, to be content in it.', reference: 'Philippians 4:11' },
  { text: 'My God will supply every need of yours according to his riches in glory in Christ Jesus.', reference: 'Philippians 4:19' },
  { text: 'But godliness with contentment is great gain.', reference: '1 Timothy 6:6' },
  { text: 'For the love of money is a root of all kinds of evil.', reference: '1 Timothy 6:10' },
  { text: 'Be free from the love of money, content with such things as you have, for he has said, “I will in no way leave you.”', reference: 'Hebrews 13:5' },
  { text: 'I have been young, and now am old, yet I have not seen the righteous forsaken, nor his children begging for bread.', reference: 'Psalm 37:25' },
  { text: 'Every good gift and every perfect gift is from above, coming down from the Father of lights.', reference: 'James 1:17' },
  { text: 'The LORD’s blessing brings wealth, and he adds no trouble to it.', reference: 'Proverbs 10:22' },
  { text: 'A good name is more desirable than great riches, and loving favor is better than silver and gold.', reference: 'Proverbs 22:1' },
  { text: 'Commit your deeds to the LORD, and your plans shall succeed.', reference: 'Proverbs 16:3' },
  // Debt & freedom
  { text: 'The rich rule over the poor. The borrower is servant to the lender.', reference: 'Proverbs 22:7' },
  { text: 'Owe no one anything, except to love one another.', reference: 'Romans 13:8' },
  { text: 'The wicked borrow, and don’t pay back, but the righteous give generously.', reference: 'Psalm 37:21' },
]

/**
 * The verse for a given day — local calendar date mapped to days-since-epoch,
 * mod the list length. Deterministic and storage-free: everyone sees the same
 * verse all day, and it rolls over at local midnight.
 */
export function verseForDay(date: Date = new Date()): Verse {
  const days = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  return VERSES[((days % VERSES.length) + VERSES.length) % VERSES.length]
}
