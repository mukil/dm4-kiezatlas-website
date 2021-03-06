package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.deepamehta.geomaps.model.GeoCoordinate;
import de.deepamehta.geomaps.GeomapsService;
import de.kiezatlas.angebote.AngebotService;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONObject;

/**
 * A data-transfer object wrapping a <code>Geo Object</code> displayable on a map.<br/>
 * Used as index to more detailed data.
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 */
public class GeoMapView implements JSONEnabled {

    // Einrichtung
    Topic geoObject = null;
    // Coordinates
    GeoCoordinate geoCoordinate = null;
    long geoCoordTopicId = -1;
    // Kiez
    Topic bezirk = null;
    Topic bezirksregion = null;
    Topic addressTopic = null;
    // Angebote
    int angeboteCount = 0;
    String angebotSearchName = null;

    Logger log = Logger.getLogger(GeoMapView.class.getName());

    public GeoMapView(Topic geoObject, GeomapsService geomaps) {
        this.geoObject = geoObject;
        getGeoCoordinate(geomaps);
    }

    public GeoMapView(Topic geoObject, GeomapsService geomaps, AngebotService angebote) {
        this.geoObject = geoObject;
        getGeoCoordinate(geomaps);
        this.angeboteCount = angebote.getAngeboteTopicsByGeoObject(geoObject).size();
    }

    public void setAngebotSearchName(String value) {
        this.angebotSearchName = value;
    }

    public String getName() {
        return this.geoObject.getChildTopics().getTopic("ka2.geo_object.name").getSimpleValue().toString();
    }

    public Topic getBezirk() {
        bezirk = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent",
            "dm4.core.child", "ka2.bezirk");
        if (bezirk == null) {
            log.log(Level.WARNING, "### Geo Object ({0}, {1}) has no BEZIRK set!",
                new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
        }
        return bezirk;
    }

    public Topic getBezirksregion() {
        bezirksregion = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent",
            "dm4.core.child", "ka2.util.bezirksregion_name");
        if (bezirksregion == null) {
            log.log(Level.WARNING, "### Geo Object ({0}, {1}) has no BEZIRKSREGION set!",
                new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
        }
        return bezirksregion;
    }

    private GeoCoordinate getGeoCoordinate(GeomapsService geomaps) {
        // fetch geo-coordinate via address
        addressTopic = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
            "dm4.core.child", "dm4.contacts.address");
        if (addressTopic != null) {
            Topic geoCoordTopic = addressTopic.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
                "dm4.core.child", "dm4.geomaps.geo_coordinate");
            if (geoCoordTopic != null) {
                geoCoordTopicId = geoCoordTopic.getId();
                addressTopic.loadChildTopics();
                return geoCoordinate = geomaps.geoCoordinate(geoCoordTopic);
            } else {
                log.log(Level.WARNING, "### Geo Object's Address (" + addressTopic.getId() + "," + geoObject
                    .getSimpleValue() + ") has no GEO COORDINATE set!");
            }
        } else {
            log.log(Level.WARNING, "### Geo Object ({0}, {1}) has no ADDRESS set!",
                new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
        }
        return null;
    }

    public long getGeoCoordinateTopicId() {
        return geoCoordTopicId;
    }

    public double getGeoCoordinateLatValue() {
        return (geoCoordinate != null) ? geoCoordinate.lat : -1000;
    }

    public double getGeoCoordinateLngValue() {
        return (geoCoordinate != null) ? geoCoordinate.lon : -1000;
    }

    /** Aggregated used to "cluster" geo objects on the map which share the same address. **/
    public String getAggregatedAddressTopicId() {
        if (addressTopic == null) {
            return "-1:-1";
        }
        Topic street = addressTopic.getChildTopics().getTopicOrNull("dm4.contacts.street");
        Topic postalCode = addressTopic.getChildTopics().getTopicOrNull("dm4.contacts.postal_code");
        String result = "";
        result += (street != null) ? street.getId() : "-1";
        result += ":";
        result += (postalCode != null) ? postalCode.getId() : "-1";
        return result;
    }

    public String getAddressValue() {
        if (addressTopic == null) {
            return "";
        }
        return addressTopic.getSimpleValue().toString();
    }

    public String getBezirkUri() {
        return (bezirk != null) ? bezirk.getUri() : "";
    }

    public String getBezirksName() {
        return (bezirk != null) ? bezirk.getSimpleValue().toString(): "";
    }

    public String getBezirksregionName() {
        return (bezirksregion != null) ? bezirksregion.getSimpleValue().toString(): "";
    }

    public boolean hasGeoCoordinateValues() {
        return (getGeoCoordinateLatValue() != -1000 && getGeoCoordinateLngValue() != -1000);
    }

    public JSONObject toJSON() {
        // needed to display geo object
        if (!hasGeoCoordinateValues()) return null;
        // needed to show the correct impressum on frontpage details card
        getBezirk();
        try {
            return new JSONObject()
                .put("uri", geoObject.getUri())
                .put("id", geoObject.getId())
                .put("name", getName())
                .put("address_id", getAggregatedAddressTopicId())
                .put("anschrift", getAddressValue())
                .put("latitude", getGeoCoordinateLatValue())
                .put("longitude", getGeoCoordinateLngValue())
                .put("bezirk_uri", getBezirkUri())
                .put("bezirk", getBezirksName())
                .put("bezirksregion", getBezirksregionName())
                .put("angebote_count", this.angeboteCount)
                .put("angebot_search_name", this.angebotSearchName);
        } catch (Exception jex) {
            throw new RuntimeException("Constructing a JSON GeoObjectView FAILED", jex);
        }
    }

}
