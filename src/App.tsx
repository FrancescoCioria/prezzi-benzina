import Map from "./Map";
import FilterBar from "./FilterBar";
import "./app.scss";

function App() {
  return (
    <div className="app">
      <FilterBar />
      <div id="map" />
      <Map />
    </div>
  );
}

export default App;
