package de.kiezatlas.website;

import java.util.logging.Logger;
import java.util.List;
import java.util.ArrayList;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;
import javax.ws.rs.core.MediaType;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.osgi.PluginActivator;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.service.GeomapsService;
import de.deepamehta.plugins.geospatial.service.GeospatialService;
import de.kiezatlas.service.KiezatlasService;
import de.kiezatlas.website.model.KiezatlasEntry;



/**
 * @author Malte Reißig (<malte@mikromedia.de>)
 * @website http://github.com/mukil/dm4-kiezatlas-website
 * @version 0.1-SNAPSHOT - compatible with DeepaMehta 4.4
 *
 */

@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class KiezatlasWebsitePlugin extends PluginActivator {

    private Logger log = Logger.getLogger(getClass().getName());

    @Inject
    KiezatlasService wsService;

    @Inject
    GeospatialService geospatialService;

    @Inject
    GeomapsService geomapsService;

    @GET
    @Path("/search/{coordinatePair}/{radius}")
    public List<KiezatlasEntry> getGeoObjectsNearBy(@PathParam("coordinatePair") String coordinates, 
            @PathParam("radius") String radius) {
        double lon = 13.4, lat = 52.5;
        if (coordinates != null && !coordinates.isEmpty() && coordinates.contains(",")) {
            lat = Double.parseDouble(coordinates.split(",")[0].trim());
            lon = Double.parseDouble(coordinates.split(",")[1].trim());
        }
        double r;
        r = (radius.isEmpty() || radius.equals("0")) ? 1.0 : Double.parseDouble(radius);
        List<Topic> geoCoordTopics = geospatialService.getTopicsWithinDistance(new GeoCoordinate(lon, lat), r);
        ArrayList<KiezatlasEntry> results = new ArrayList<KiezatlasEntry>();
        for (Topic geoCoordTopic : geoCoordTopics) {
            GeoCoordinate geoCoord = geomapsService.geoCoordinate(geoCoordTopic);
            Topic address = geoCoordTopic.getRelatedTopic("dm4.core.composition", "dm4.core.child", "dm4.core.parent", "dm4.contacts.address");
            if (address != null) {
                ResultList<RelatedTopic> geoObjects = address.getRelatedTopics("dm4.core.composition", "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
                for (RelatedTopic geoObject : geoObjects) {
                    results.add(new KiezatlasEntry(geoObject, geoCoordTopic, geoCoord));
                }
            } else {
                log.info("No Address Entry found for geo-coordinate " + geoCoordTopic.getSimpleValue());
            }
        }
        return results;
    }

}
