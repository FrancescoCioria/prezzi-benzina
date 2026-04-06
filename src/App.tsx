import Map from "./Map";
import StationList from "./StationList";
import FilterBar from "./FilterBar";
import "./app.scss";

function App() {
  return (
    <div className="app">
      <FilterBar />
      <div id="map" />
      <Map />
      <StationList />
    </div>
  );
}

export default App;
