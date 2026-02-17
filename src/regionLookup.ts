import * as fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const filePath: string = "../../Downloads/gtfs_puget_sound_consolidated/stops.txt";

const content: string = fs.readFileSync(filePath, "utf-8");

interface StopInfo {
  stop_id: string;
  stop_name: string;
  stop_code: string;
  stop_lat: number;
  stop_lon: number;
  county_name?: string;
  state_name?: string;
}

interface ResultsInfo {
  stop_id: string,
  stop_lat: number,
  stop_lon: number,
  city_name: string,
  county_name: string,
  state_name: string,
  zip_code: string
}

const results = []

const stops: StopInfo[] = [];

const lines = content.trim().split("\n");
const rows = lines.map(line => line.split(","));

const STOP_ID_INDEX = 0;
const STOP_NAME_INDEX = 1;
const LAT_INDEX = 2;
const LONG_INDEX = 3;
const STOP_CODE_INDEX = 4;

for (const row of rows.slice(1)) {
  const stop_id = row[STOP_ID_INDEX];
  const stop_name = row[STOP_NAME_INDEX];
  const stop_code = row[STOP_CODE_INDEX];
  const stop_lat = parseFloat(row[LAT_INDEX]);
  const stop_lon = parseFloat(row[LONG_INDEX]);

  if (!isNaN(stop_lat) && !isNaN(stop_lon)) {
    stops.push({ stop_id, stop_name,stop_lat, stop_lon, stop_code });
  }
}



async function reverseGeocode(lat: number, lon: number) {
  const baseUrl = "https://maps.googleapis.com/maps/api/geocode/json";

  const url = `${baseUrl}?latlng=${lat},${lon}&key=${process.env.GOOGLEMAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    return json;
  } catch (err) {
    console.error("Geocode request failed:", err);
    return null;
  }
}

async function processStops(stops: StopInfo[]) {

  for (const stop of stops) {
    const data = await reverseGeocode(stop.stop_lat, stop.stop_lon);

    const findComponent = (type: string) =>
      data?.results?.[0]?.address_components?.find(c => c.types.includes(type));

    const record = {
      stop_id: stop.stop_id,
      stop_name: stop.stop_name,
      stop_lat: stop.stop_lat,
      stop_lon: stop.stop_lon,
      stop_code: stop.stop_code,
      city_name: findComponent("locality")?.long_name || null,
      county_name: findComponent("administrative_area_level_2")?.long_name || null,
      state_name: findComponent("administrative_area_level_1")?.long_name || null,
      zip_code: findComponent("postal_code")?.long_name || null,
    };

    // save into results just for testing
    results.push(record);

    // File appending this adds a comma after every json object
    fs.appendFileSync("gtfs_results.json", JSON.stringify(record) + ",\n");

    console.log(`Processed ${stop.stop_id}`);
  }
}

processStops(stops);
