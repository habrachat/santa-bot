# santa-bot

A fun interactive game bot for SSH chat rooms that lets users catch creatures, battle each other, and collect items. Think Pokémon meets SSHChat!

## Features

- 🎮 Catch wild creatures that appear randomly
- ⚔️ Battle other players with your creatures
- 📦 Collect items and coins
- 🔝 Level up your creatures through battles
- 💼 Manage your inventory of items and creatures
- 🏆 Steal items or coins from defeated opponents

## Installation

1. Clone the repository:
```bash
git clone https://github.com/174n/santa-bot
cd santa-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure your SSH settings in `config.ts`:
```json
{
  "host": "127.0.0.1",
  "port": 2222,
  "username": "sata",
  "privateKeyPath": "./id_ed25519"
}
```

4. Run the bot:
```bash
npm start
```

## Commands

- `!catch` - Catch a wild creature when it appears
- `!collect` - Collect items or coins when they appear
- `!battle <opponent>` - Challenge another player to a battle
- `!accept` - Accept a battle challenge
- `!decline` - Decline a battle challenge
- `!profile` - View your profile, creatures, and inventory
- `!choose` - Choose the creature which will be active in combat
- `!use <item> <creature_index>` - Use an item on one of your creatures (WIP)
- `!help` - Show available commands

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
