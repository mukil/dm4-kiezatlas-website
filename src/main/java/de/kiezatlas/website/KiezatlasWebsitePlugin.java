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
import de.deepamehta.core.service.Transactional;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.service.GeomapsService;
import de.deepamehta.plugins.geospatial.service.GeospatialService;
import de.mikromedia.webpages.service.WebpagePluginService;
import de.kiezatlas.service.KiezatlasService;
import de.kiezatlas.website.model.BezirkView;
import de.kiezatlas.website.model.GeoObjectDetailsView;
import de.kiezatlas.website.model.GeoObjectView;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.util.logging.Level;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;

/**
 * The module shipping the Kiezatlas 2 Website.<br/>
 * Based on dm44-kiezatlas-2.1.6 and dm44-kiezatlas-etl-0.0.2<br/>
 * Compatible with DeepaMehta 4.4.
 * <a href="http://github.com/mukil/dm4-kiezatlas-website">Source Code</a>
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 * @version 0.2-SNAPSHOT
 */
@Path("/kiezatlas")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class KiezatlasWebsitePlugin extends PluginActivator {

    private final Logger log = Logger.getLogger(getClass().getName());

    @Inject KiezatlasService kiezService;

    @Inject WebpagePluginService pageService;

    @Inject GeospatialService spatialService;

    @Inject GeomapsService geomapsService;

    @Override
    public void init() {
        log.info("Setting new Frontpage Resource via WebpagePluginService");
        pageService.setFrontpageResource("/web/index.html", "de.kiezatlas.website");
    }

    @GET
    @Produces(MediaType.TEXT_HTML)
    public InputStream getKiezatlasWebsite() {
        return getStaticResource("web/index.html");
    }

    @GET
    @Path("/topic/{topicId}")
    public GeoObjectDetailsView getKiezatlasTopicView(@HeaderParam("Referer") String referer,
													  @PathParam("topicId") long topicId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        return new GeoObjectDetailsView(dms.getTopic(topicId), geomapsService);
    }

    @GET
    @Path("/search/{coordinatePair}/{radius}")
    public List<GeoObjectView> getGeoObjectsNearBy(@PathParam("coordinatePair") String coordinates,
												   @PathParam("radius") String radius) {
        double lon = 13.4, lat = 52.5;
        if (coordinates != null && !coordinates.isEmpty() && coordinates.contains(",")) {
            lon = Double.parseDouble(coordinates.split(",")[0].trim());
            lat = Double.parseDouble(coordinates.split(",")[1].trim());
        }
        double r;
        r = (radius.isEmpty() || radius.equals("0")) ? 1.0 : Double.parseDouble(radius);
        List<Topic> geoCoordTopics = spatialService.getTopicsWithinDistance(new GeoCoordinate(lon, lat), r);
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        for (Topic geoCoordTopic : geoCoordTopics) {
            // GeoCoordinate geoCoord = geomapsService.geoCoordinate(geoCoordTopic);
            Topic address = geoCoordTopic.getRelatedTopic("dm4.core.composition", "dm4.core.child",
                "dm4.core.parent", "dm4.contacts.address");
            if (address != null) {
                ResultList<RelatedTopic> geoObjects = address.getRelatedTopics("dm4.core.composition",
                    "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
                for (RelatedTopic geoObject : geoObjects) {
                    results.add(new GeoObjectView(geoObject, geomapsService));
                }
            } else {
                log.log(Level.INFO, "No Address Entry found for geocoordinate {0}", geoCoordTopic.getSimpleValue());
            }
        }
        return results;
    }

    @GET
    @Path("/search")
    @Transactional
    public List<GeoObjectView> searchGeoObjectTopics(@HeaderParam("Referer") String referer,
													 @QueryParam("search") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            log.log(Level.INFO, "> query=\"{0}\"", query);
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (query.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            List<Topic> singleTopics = dms.searchTopics(query, null);
            log.log(Level.INFO, "{0} topics found", singleTopics.size());
            for (Topic topic : singleTopics) {
                if (topic.getTypeUri().equals("ka2.geo_object.name")) {
                    Topic geoObject = topic.getRelatedTopic("dm4.core.composition",
                        "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
                    results.add(new GeoObjectView(geoObject, geomapsService));
                } else {
                    log.log(Level.INFO, "### NO Geo Object MATCH for query="+query+", just a "+topic.getTypeUri()
                            +"-data-entry");
                }
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics failed", e);
        }
    }

    @GET
    @Path("/by_name")
    public List<GeoObjectView> getGeoObjectsByName(@HeaderParam("Referer") String referer,
												   @QueryParam("query") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            log.log(Level.INFO, "> nameQuery=\"{0}\"", query);
            String queryValue = query.trim();
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (queryValue.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            List<Topic> singleTopics = dms.searchTopics(queryValue, "ka2.geo_object.name");
            log.log(Level.INFO, "{0} name topics found", singleTopics.size());
            for (Topic topic : singleTopics) {
                Topic geoObject = topic.getRelatedTopic("dm4.core.composition",
                    "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
                results.add(new GeoObjectView(geoObject, geomapsService));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching topics failed", e);
        }
    }

    // --- Kiezatlas City Resources: Bezirk and Bezirksregion

    @GET
    @Path("/bezirk")
    public List<BezirkView> getKiezatlasDistricts() {
        ArrayList<BezirkView> results = new ArrayList<BezirkView>();
        for (RelatedTopic bezirk : dms.getTopics("ka2.bezirk", 0)) {
            results.add(new BezirkView(bezirk));
        }
        return results;
    }

    @GET
    @Path("/bezirk/{topicId}")
    public List<GeoObjectView> getKiezatlasMapEntriesByDistrict(@HeaderParam("Referer") String referer,
																@PathParam("topicId") long bezirkId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        Topic bezirk = dms.getTopic(bezirkId);
        ResultList<RelatedTopic> geoObjects = bezirk.getRelatedTopics("dm4.core.aggregation",
            "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
        for (RelatedTopic geoObject : geoObjects) {
            results.add(new GeoObjectView(geoObject, geomapsService));
        }
        return results;
    }

    @GET
    @Path("/bezirksregion")
    public ResultList<RelatedTopic> getKiezatlasSubregions() {
        return dms.getTopics("ka2.bezirksregion", 0);
    }

    @GET
    @Path("/bezirksregion/{topicId}")
    public List<GeoObjectView> getKiezatlasMapEntriesBySubdistrict(@HeaderParam("Referer") String referer,
																   @PathParam("topicId") long bezirksregionId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        Topic bezirksregion = dms.getTopic(bezirksregionId);
        ResultList<RelatedTopic> geoObjects = bezirksregion.getRelatedTopics("dm4.core.aggregation",
            "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
        for (RelatedTopic geoObject : geoObjects) {
            results.add(new GeoObjectView(geoObject, geomapsService));
        }
        return results;
    }

    // --- Geo Coding Utiltiy Resources (Google Wrapper)

    @GET
    @Path("/geocode/{input}")
    public String geoCodeAddressInput(@HeaderParam("Referer") String referer,
        @PathParam("input") String input) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        String query = input;
        String result = "";
        query = query.substring(2, query.length() - 1);
        try {
            // Encoded url to open
            query = URLEncoder.encode(query, "UTF-8");
            String url = "http://maps.googleapis.com/maps/api/geocode/json?address="
                + query + "&sensor=false&locale=de";
            URLConnection connection = new URL(url).openConnection();
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Charset", "UTF-8");
            // Get the response
            BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(),
                "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = rd.readLine()) != null) {
                sb.append(line);
            }
            rd.close();
            result = sb.toString();
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
        return result;
    }

    @GET
    @Path("/reverse-geocode/{latlng}")
    public String geoCodeLocationInput(@HeaderParam("Referer") String referer,
        @PathParam("latlng") String latlng) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        String result = "";
        try {
            String url = "https://maps.googleapis.com/maps/api/geocode/json?latlng="
                + latlng + "&language=de";
            // &result_type=street_address|postal_code&key=API_KEY
            URLConnection connection = new URL(url).openConnection();
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Charset", "UTF-8");
            // Get the response
            BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(),
                "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = rd.readLine()) != null) {
                sb.append(line);
            }
            rd.close();
            result = sb.toString();
            log.info("Reverse Geo Coded Location ("+latlng+") successfully.");
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
        return result;
    }

    // --- Private Utility Methods

    private boolean isValidReferer (String ref) {
        if (ref == null) return false;
        if (ref.contains(".kiezatlas.de/") ||  ref.contains("localhost")) {
            return true;
        } else {
            return false;
        }
    }

}
