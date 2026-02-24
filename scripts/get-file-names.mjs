import 'dotenv/config'
import { google } from 'googleapis'

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
)
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const drive = google.drive({ version: 'v3', auth })

const ids = [
  '1uz9mEQYFfgDarCdmZg-uy_vuVGB6_0PU',
  '1JI85piiFGnYUiwlDcZF8wBSjMsp0zSsp',
  '1N5de1O7dYQOp3wIOi9HB7asBWJRQ4NzO',
  '16u8L1jst6vWzFnoTp2yeEvwav3OsM2Ap',
  '125j1ciyDoPw_fyquNaL2KrLBR0i5agjo',
  '1nTnE_mXAxt3BwzoQmPR2xiMyNsYNj6tP',
  '1gS5OTm8AvTDp9ZCgEmEyFund75Yk04aP',
  '1ZhlcCXxqa0xd1ksbFMeuVlD7aPvnBD9W',
  '1T-XSmFFRoET3PcjTPpjMx4xhpY6TjjFU',
  '1b8ugLwXk0iQCovasan-7XjlG5TPL6H5T',
  '1tPIyEs71MEqTSlPwCUOMls41s6D3RH6F',
  '1AQz0-k5OovceclF0kH8BzdQIzZIxzkfT',
]

for (const id of ids) {
  const res = await drive.files.get({ fileId: id, fields: 'id, name' })
  console.log(`${res.data.id}\t${res.data.name}`)
}
