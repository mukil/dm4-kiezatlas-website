package de.kiezatlas.website;

import com.sun.jersey.api.view.Viewable;
import java.util.*;
import java.util.logging.Logger;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;
import javax.ws.rs.core.MediaType;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.core.service.Transactional;
import de.deepamehta.plugins.facets.FacetsService;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.GeomapsService;
import de.deepamehta.plugins.geospatial.GeospatialService;
import de.deepamehta.plugins.webactivator.WebActivatorPlugin;
import de.deepamehta.plugins.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasService;
import de.kiezatlas.angebote.AngebotService;
import de.kiezatlas.angebote.model.AngebotsInfo;
import de.kiezatlas.website.model.BezirkView;
import de.kiezatlas.website.model.EinrichtungsInfo;
import de.kiezatlas.website.model.GeoObjectDetailsView;
import de.kiezatlas.website.model.GeoObjectView;
import de.mikromedia.webpages.WebpagePluginService;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.util.logging.Level;
import java.util.HashMap;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;

/**
 * The module bundling the Kiezatlas 2 Website.<br/>
 * Based on dm47-kiezatlas-2.1.7-SNAPSHOT, dm47-kiezatlas-etl-0.2.1-SNAPSHOT and dm47-webpages-0.3.<br/>
 * Compatible with DeepaMehta 4.7
 * <a href="http://github.com/mukil/dm4-kiezatlas-website">Source Code</a>
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 * @version 0.3-SNAPSHOT
 */
@Path("/website")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class WebsitePlugin extends WebActivatorPlugin implements WebsiteService {

    private final Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;
    @Inject private WebpagePluginService pageService;
    @Inject private GeospatialService spatialService;
    @Inject private AngebotService angeboteService;
    @Inject private GeomapsService geomapsService;
    @Inject private FacetsService facetsService;
    // @Inject KiezatlasService kiezatlas;

    // Application Cache of District Overview Resultsets
    HashMap<Long, List<GeoObjectView>> districtsCache = new HashMap<Long, List<GeoObjectView>>();
    HashMap<Long, Long> districtCachedAt = new HashMap<Long, Long>();

    /**
     * Sets the Kiezatlas Website index.html as main resource to be served at "/" by the webpages-module.
     */
    @Override
    public void init() {
        pageService.setFrontpageResource("/web/index.html", "de.kiezatlas.website");
        initTemplateEngine();
    }

    /**
     * Responds the frontpage of the Kiezatlas Website.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    public Viewable getWebsite() {
        return view("index");
    }

    @GET
    @Path("/menu")
    @Produces(MediaType.TEXT_HTML)
    public Viewable getWebsiteMenu() {
        return view("menu");
    }

    /**
     * Fetches Geo Objects to be displayed in a map by WGS 84 coordinate pair (Longitude, Latitude) and a radius in km.
     * @param coordinates
     * @param radius
     */
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
                    results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
                }
            } else {
                log.log(Level.INFO, "No Address Entry found for geocoordinate {0}", geoCoordTopic.getSimpleValue());
            }
        }
        return results;
    }

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by text query.
     * @param referer
     * @param query
     */
    @GET
    @Path("/search")
    public List<GeoObjectView> searchGeoObjectsFulltext(@HeaderParam("Referer") String referer,
                                                        @QueryParam("search") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // TODO: Maybe it is also desirable that we wrap the users query into quotation marks
        // (to allow users to search for a combination of words)
        try {
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (query.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            List<Topic> geoObjects = searchFulltextInGeoObjectChilds(query);
            // iterate over merged results
            log.info("Start building response for " + geoObjects.size() + " OVERALL");
            for (Topic topic : geoObjects) {
                results.add(new GeoObjectView(topic, geomapsService, angeboteService));
            }
            log.info("Build up response " + results.size() + " geo objects across all districts");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics failed", e);
        }
    }

    @Override
    public List<Topic> searchFulltextInGeoObjectChilds(String query) {
        // ### Todo: Fetch for ka2.ansprechpartner, traeger name, too
        HashMap<Long, Topic> uniqueResults = new HashMap<Long, Topic>();
        List<Topic> searchResults = dms.searchTopics(query, "ka2.geo_object.name");
        List<Topic> descrResults = dms.searchTopics(query, "ka2.beschreibung");
        List<Topic> stichworteResults = dms.searchTopics(query, "ka2.stichworte");
        // List<Topic> sonstigesResults = dms.searchTopics(query, "ka2.sonstiges");
        List<Topic> bezirksregionResults = dms.searchTopics(query, "ka2.bezirksregion");
        // List<Topic> traegerNameResults = dms.searchTopics(query, "ka2.traeger.name");
        // List<Topic> traegerNameResults = dms.searchTopics(query, "dm4.contacts.street");
        log.info("> " + searchResults.size() + ", "+ descrResults.size() +", "+stichworteResults.size() + ", " + bezirksregionResults.size()
                + " results in four child types for query=\""+query+"\" in FULLTEXT");
        // merge all three types in search results
        searchResults.addAll(descrResults);
        searchResults.addAll(stichworteResults);
        // searchResults.addAll(sonstigesResults);
        searchResults.addAll(bezirksregionResults);
        // searchResults.addAll(traegerNameResults);
        // make search results only contain unique geo object topics
        log.info("Building up unique search resultset of fulltext search...");
        Iterator<Topic> iterator = searchResults.iterator();
        while (iterator.hasNext()) {
            Topic next = iterator.next();
            Topic geoObject = getParentGeoObjectTopic(next);
            if (!uniqueResults.containsKey(geoObject.getId())) {
                uniqueResults.put(geoObject.getId(), geoObject);
            }
        }
        log.info("searchResultLength=" + (searchResults.size()) + ", " + "uniqueResultLength=" + uniqueResults.size());
        return new ArrayList(uniqueResults.values());
    }

    /**
     * Fetches a list of Geo Objects to be displayed in a map by name.
     * Ditch searchGeoObjectNames in KiezatlasPlugin (used by Famportal-Angular service).
     * @param referer
     * @param query
     */
    @GET
    @Path("/search/by_name")
    public List<GeoObjectView> searchGeoObjectsByName(@HeaderParam("Referer") String referer,
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
                results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics by name failed", e);
        }
    }

    /**
     * Fetches details about a Kiezatlas Geo Object.
     *
     * @param referer
     * @param topicId
     */
    @GET
    @Path("/topic/{topicId}")
    @Produces(MediaType.APPLICATION_JSON)
    public GeoObjectDetailsView getGeoObjectDetails(@HeaderParam("Referer") String referer,
                                                      @PathParam("topicId") long topicId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        return new GeoObjectDetailsView(dms.getTopic(topicId), geomapsService, angeboteService);
    }

    /**
     * Renders details about a Kiezatlas Geo Object into HTML.
     *
     * @param topicId
     * @return
     */
    @GET
    @Path("/topic/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable getGeoObjectDetailsPage(@PathParam("topicId") long topicId) {
        Topic geoObject = dms.getTopic(topicId);
        if (!geoObject.getTypeUri().equals(KiezatlasService.GEO_OBJECT)) return view("404");
        // Assemble Generic Einrichtungs Infos
        EinrichtungsInfo einrichtung = assembleGeneralEinrichtungsInfo(geoObject);
        viewData("geoobject", einrichtung);
        // Assemble Category Assignments for Einrichtung
        ResultList<RelatedTopic> relatedTopics = geoObject.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent",
            "dm4.core.child", "ka2.criteria.thema", 0);
        viewData("themen", relatedTopics);
        ResultList<RelatedTopic> relatedServices = geoObject.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent",
            "dm4.core.child", "ka2.criteria.angebote", 0);
        viewData("angebote", relatedServices);
        ResultList<RelatedTopic> relatedAudiences = geoObject.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent",
            "dm4.core.child", "ka2.criteria.zielgruppe", 0);
        viewData("zielgruppen", relatedAudiences);
        // Assemble Angebosinfos for Einrichtung
        ResultList<RelatedTopic> angebotsInfos = angeboteService.getAngeboteTopics(topicId);
        if (angebotsInfos.getSize() > 0) viewData("angebotsinfos", angebotsInfos);
        return view("geoobject");
    }

    // --- Bezirk Specific Resource Search, Overall, Listing

    @GET
    @Path("/bezirk")
    public List<BezirkView> getKiezatlasDistricts() {
        ArrayList<BezirkView> results = new ArrayList<BezirkView>();
        for (RelatedTopic bezirk : dms.getTopics("ka2.bezirk", 0)) {
            results.add(new BezirkView(bezirk));
        }
        return results;
    }

    /**
     * We cache subsequent requests to this method, which means that on the district pages it will take 6 hours until
     * a new index will be generated (and newly added geo objects will appear on the map).
     *
     * Details of existing (but updated) geo objects are not affected by this cache.
     * @param referer
     * @param bezirkId
     */
    @GET
    @Path("/bezirk/{topicId}")
    public List<GeoObjectView> getGeoObjectsByDistrict(@HeaderParam("Referer") String referer,
                                                       @PathParam("topicId") long bezirkId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // use cache
        if (districtsCache.containsKey(bezirkId)) {
            // caching lifetime is 30 000 or 12 000 ms for testing purposes
            if (districtCachedAt.get(bezirkId) > new Date().getTime() - 21600000) { // 21600000 for approx. 6hr in ms
                log.info("Returning cached list of geo object for district " + bezirkId);
                return districtsCache.get(bezirkId);
            }
            // invalidate cache
            districtsCache.remove(bezirkId);
            districtCachedAt.remove(bezirkId);
        }
        // populate new resultset
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        Topic bezirk = dms.getTopic(bezirkId);
        ResultList<RelatedTopic> geoObjects = bezirk.getRelatedTopics("dm4.core.aggregation",
            "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
        for (RelatedTopic geoObject : geoObjects) {
            results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
        }
        log.info("Populating cached list of geo object for district " + bezirkId);
        // insert new result into cache
        districtsCache.put(bezirkId, results);
        districtCachedAt.put(bezirkId, new Date().getTime());
        return results;
    }

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by district topic id and text query.
     * @param referer
     * @param districtId
     * @param query
     */
    @GET
    @Path("/search/{districtId}")
    @Transactional
    public List<GeoObjectView> searchGeoObjectTopicsInDistrict(@HeaderParam("Referer") String referer,
                                                               @PathParam("districtId") long districtId,
                                                               @QueryParam("search") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (query.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            List<Topic> geoObjects = searchFulltextInGeoObjectChilds(query);
            // iterate over merged results
            log.info("Start building response for " + geoObjects.size() + " and FILTER by DISTRICT");
            for (Topic geoObject: geoObjects) {
                // check for district
                if (hasRelatedBezirk(geoObject, districtId)) {
                    results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
                }
            }
            log.info("Build up response " + results.size() + " geo objects in district=\""+districtId+"\"");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics failed", e);
        }
    }

    // --- Bezirksregionen Resources Listing

    @GET
    @Path("/bezirksregion")
    public ResultList<RelatedTopic> getKiezatlasSubregions() {
        return dms.getTopics("ka2.bezirksregion", 0);
    }

    @GET
    @Path("/bezirksregion/{topicId}")
    public List<GeoObjectView> getGeoObjectsBySubregions(@HeaderParam("Referer") String referer,
                                                          @PathParam("topicId") long bezirksregionId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        Topic bezirksregion = dms.getTopic(bezirksregionId);
        ResultList<RelatedTopic> geoObjects = bezirksregion.getRelatedTopics("dm4.core.aggregation",
            "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
        for (RelatedTopic geoObject : geoObjects) {
            results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
        }
        return results;
    }

    // --- Utility Resources (Geo Coding and Reverse Geo Coding)

    @GET
    @Path("/geocode")
    public String geoCodeAddressInput(@HeaderParam("Referer") String referer,
                                      @QueryParam("query") String input) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        String query = input;
        String result = "";
        try {
            // Encoded url to open
            log.info("Requested geo code query=\"" + query + "\" - Processing");
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

    // ------------------------------------------------------------------------------------------------- Private Methods

    private Topic getParentGeoObjectTopic(Topic entry) {
        return entry.getRelatedTopic(null, "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
    }

    private boolean hasRelatedBezirk(Topic geoObject, long bezirksId) {
        Topic relatedBezirk = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent",
                "dm4.core.child", "ka2.bezirk");
        if (relatedBezirk == null) return false;
        if (relatedBezirk.getId() == bezirksId) return true;
        return false;
    }

    private boolean isValidReferer(String ref) {
        if (ref == null) return false;
        if (ref.contains(".kiezatlas.de/") || ref.contains("localhost")) {
            return true;
        } else {
            return false;
        }
    }

    private EinrichtungsInfo assembleGeneralEinrichtungsInfo(Topic einrichtung) {
        EinrichtungsInfo infoModel = new EinrichtungsInfo();
        try {
            einrichtung.loadChildTopics();
            infoModel.setName(einrichtung.getChildTopics().getString(KiezatlasService.GEO_OBJECT_NAME));
            Topic addressTopic = einrichtung.getChildTopics().getTopic(KiezatlasService.GEO_OBJECT_ADDRESS);
            infoModel.setAddress(addressTopic.getSimpleValue().toString());
            infoModel.setCoordinate(geomapsService.getGeoCoordinate(addressTopic));
            // Kontakt Facet
            Topic kontakt = facetsService.getFacet(einrichtung, KONTAKT_FACET);
            if (kontakt != null) {
                kontakt.loadChildTopics();
                infoModel.setEmail(kontakt.getChildTopics().getString(KONTAKT_MAIL));
                infoModel.setFax(kontakt.getChildTopics().getString(KONTAKT_FAX));
                infoModel.setTelefon(kontakt.getChildTopics().getString(KONTAKT_TEL));
                infoModel.setAnsprechpartner(kontakt.getChildTopics().getString(KONTAKT_ANSPRECHPARTNER));
            }
            // Öffnungszeiten Facet
            Topic offnung = facetsService.getFacet(einrichtung, OEFFNUNGSZEITEN_FACET);
            if (offnung != null) infoModel.setOeffnungszeiten(offnung.getSimpleValue().toString());
            // Beschreibung Facet
            Topic beschreibung = facetsService.getFacet(einrichtung, BESCHREIBUNG_FACET);
            if (beschreibung != null) infoModel.setBeschreibung(beschreibung.getSimpleValue().toString());
            // Stichworte Facet
            Topic stichworte = facetsService.getFacet(einrichtung, STICHWORTE_FACET);
            if (stichworte != null) infoModel.setStichworte(stichworte.getSimpleValue().toString());
            // LOR Nummer Facet
            Topic lor = facetsService.getFacet(einrichtung, LOR_FACET);
            if (lor != null) infoModel.setLORId(lor.getSimpleValue().toString());
            // Website Facet
            Topic website = facetsService.getFacet(einrichtung, WEBSITE_FACET);
            if (website != null) infoModel.setWebpage(website.getSimpleValue().toString());
            infoModel.setId(einrichtung.getId());
        } catch (Exception ex) {
            throw new RuntimeException("Could not assemble EinrichtungsInfo", ex);
        }
        return infoModel;
    }

}
