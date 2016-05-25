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
import de.deepamehta.plugins.accesscontrol.AccessControlService;
import de.deepamehta.plugins.facets.FacetsService;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.GeomapsService;
import de.deepamehta.plugins.geospatial.GeospatialService;
import de.deepamehta.plugins.webactivator.WebActivatorPlugin;
import de.deepamehta.plugins.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasService;
import de.kiezatlas.angebote.AngebotService;
import de.kiezatlas.angebote.model.AngebotsInfoAssigned;
import de.kiezatlas.website.model.BezirkInfo;
import de.kiezatlas.website.model.EinrichtungsInfo;
import de.kiezatlas.website.model.GeoObjectDetailsView;
import de.kiezatlas.website.model.GeoObjectView;
import de.mikromedia.webpages.WebpagePluginService;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.util.logging.Level;
import java.util.HashMap;
import javax.ws.rs.FormParam;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

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
    @Inject private AccessControlService acService;
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
     * ### Unused: see init
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    public Viewable getWebsite() {
        return view("index");
    }

    /**
     * Processes the form for editing a Kiezatlas Einrichtung.
     */
    @POST
    @Produces(MediaType.TEXT_HTML)
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Path("/topic/save")
    public Viewable createGeoObject(@FormParam("id") String topicId, @FormParam("name") String name, @FormParam("strasse") String strasse, @FormParam("plz") String plz, @FormParam("city") String city,
            @FormParam("beschreibung") String beschreibung, @FormParam("open") String oeffnungszeiten, @FormParam("ansprechpartner") String ansprechpartner,
            @FormParam("telefon") String telefon, @FormParam("email") String email, @FormParam("fax") String fax, @FormParam("website") String website, 
            @FormParam("lat") double latitude, @FormParam("lon") double longitude) {
        Topic geoObject = null;
        // 1) Check if form submission deals with an UPDATE or CREATE
        String districtName = "", coordinatePair = "", geoLocation = "";
        if (topicId != null) {
            log.info("UPDATE Einrichtung " + name + " (TopicID: " + topicId + ")");
        } else {
            log.info("CREATE Einrichtung " + name + ", Straße: " + strasse + ", in \"" + plz + " " + city + "\"");
        }
        // 2) Find out Geo Coordinate and District of Geo Object
        if (latitude == 0 || longitude == 0) {
            log.info("> Resetting Geo Coordinates " + latitude + ", " + longitude);
            geoLocation = geoCodeAddressInput(URLEncoder.encode(strasse + ", " + plz + " " + city));
            coordinatePair = parseFirstCoordinatePair(geoLocation);
            districtName = parseFirstSublocality(geoLocation);
            log.info("> Geocoded Street, Postal Code City Value to \"" + coordinatePair + "\"");
        } else {
            log.info("> Geo Coordinates provided: " + latitude + ", " + longitude);
        }
        // 3) ### Assemble and create new Geo Object Topic
        // 4) ### Assign current user and correct district flag
        // 5) ### Set as "unpublished" (just leave it unassigned regarding a "Site" topic)
        // ..) Prepare new page
        if (geoObject != null) {
            viewData("message", "Einrichtung \"" + name + " wurde erfolgreich angelegt.");
            // ### Author Relation
            // ### Bezirk Relation
            // ### Geo Coordinate
        } else {
            viewData("message", "Die Einrichtung konnte nicht angelegt werden.");
        }
        return getGeoObjectForm(Long.parseLong(topicId));
    }

    /**
     * Builds up a form for editing a Kiezatlas Einrichtung.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/topic/edit/{topicId}")
    public Viewable getGeoObjectForm(@PathParam("topicId") long topicId) {
        Topic geoObject = dms.getTopic(topicId);
        if (!isAuthenticated()) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        if (geoObject != null && geoObject.getTypeUri().equals(KiezatlasService.GEO_OBJECT)) {
            // Assemble Generic Einrichtungs Infos
            EinrichtungsInfo einrichtung = assembleGeneralEinrichtungsInfo(geoObject);
            viewData("geoobject", einrichtung);
            viewData("message", "Einrichtung \"" + geoObject.getSimpleValue() + " erfolgreich geladen.");
        } else {
            // ### throw 401
            viewData("message", "Eine Einrichtung mit dieser ID ist uns nicht bekannt.");
        }
        viewData("authenticated", isAuthenticated());
        return view("edit");
    }

    /**
     * Builds up a form for editing a Kiezatlas Einrichtung.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/topic/create")
    public Viewable getGeoObjectForm() {
        if (!isAuthenticated()) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        EinrichtungsInfo geoObject = new EinrichtungsInfo();
        geoObject.setCoordinates(new GeoCoordinate(13.4, 52.5));
        geoObject.setName("Neuer Eintrag");
        geoObject.setCity("Berlin");
        geoObject.setId(-1);
        viewData("geoobject", geoObject);
        viewData("authenticated", isAuthenticated());
        return view("edit");
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
        List<AngebotsInfoAssigned> angebotsInfos = angeboteService.getAngebotsInfosAssigned(geoObject);
        if (angebotsInfos.size() > 0) viewData("angebotsinfos", angebotsInfos);
        viewData("authenticated", isAuthenticated());
        return view("detail");
    }

    /**
     * Fetches details about a Kiezatlas Geo Object.
     *
     * ### Revise DTO.
     *
     * @param referer
     * @param topicId
     * @return A GeoObject DetailsView as DTO to presend details about a place.
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
     * Fetches Geo Objects to be displayed in a map by WGS 84 coordinate pair (Longitude, Latitude)
     * and a numerical radius (provide in km).
     * @param coordinates
     * @param radius
     */
    @GET
    @Path("/search/{coordinatePair}/{radius}")
    public List<GeoObjectView> getGeoObjectsNearBy(@PathParam("coordinatePair") String coordinates,
                                                   @PathParam("radius") String radius) {
        // .) ### Authenticate...
        // 0) Set default coordinates for a query
        double lon = 13.4, lat = 52.5;
        if (coordinates != null && !coordinates.isEmpty() && coordinates.contains(",")) {
            lon = Double.parseDouble(coordinates.split(",")[0].trim());
            lat = Double.parseDouble(coordinates.split(",")[1].trim());
        }
        // 1) Set default search radius for a query
        double r = (radius.isEmpty() || radius.equals("0")) ? 1.0 : Double.parseDouble(radius);
        List<Topic> geoCoordTopics = spatialService.getTopicsWithinDistance(new GeoCoordinate(lon, lat), r);
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        // 2) Process spatial search results (=topics of type Geo Coordinate)
        for (Topic geoCoordTopic : geoCoordTopics) {
            // 2.1) Check for an Address topic
            Topic address = geoCoordTopic.getRelatedTopic("dm4.core.composition", "dm4.core.child",
                "dm4.core.parent", "dm4.contacts.address");
            if (address != null) {
                // 2.1.1) If place has an address set, create a DTO for map display
                ResultList<RelatedTopic> geoObjects = address.getRelatedTopics("dm4.core.composition",
                    "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
                for (RelatedTopic geoObject : geoObjects) {
                    results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
                }
            } else {
                // 2.1.2) If place has NO address set, skip place for map display
                log.log(Level.INFO, "No Address Entry found for geo coordinate {0}", geoCoordTopic.getSimpleValue());
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
        // .) ### Authenticate
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // TODO: Maybe it is also desirable that we wrap the users query into quotation marks
        // (to allow users to search for a combination of words)
        try {
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (query.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            // 1) Fetch unique geo object topics by text query string
            List<Topic> geoObjects = searchFulltextInGeoObjectChilds(query);
            // 2) Process saerch results and create DTS for map display
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

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by district
     * topic id and text query.
     * @param referer
     * @param districtId
     * @param query
     */
    @GET
    @Path("/search/{districtId}")
    @Transactional
    public List<GeoObjectView> searchGeoObjectsFulltextInDistrict(@HeaderParam("Referer") String referer,
            @PathParam("districtId") long districtId, @QueryParam("search") String query) {
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

    /**
     * Fires searchTopic()-calls to find Geo Object topics by their:
     * <ul>
     *  <li>Geo Object Name</li>
     *  <li>Beschreibung Facet</li>
     *  <li>Stichworte Facet</li>
     *  <li>Bezirksregion Facet</li>
     * </ul>
     * @param query
     * @return A list of unique topics of type "ka2.geo_object".
     */
    @Override
    public List<Topic> searchFulltextInGeoObjectChilds(String query) {
        // ### Authenticate
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

    // --- Bezirk Specific Resource Search, Overall, Listing

    @GET
    @Path("/bezirk")
    public List<BezirkInfo> getKiezatlasDistricts() {
        ArrayList<BezirkInfo> results = new ArrayList<BezirkInfo>();
        for (RelatedTopic bezirk : dms.getTopics("ka2.bezirk", 0)) {
            results.add(new BezirkInfo(bezirk));
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

    @GET
    @Path("/geocode")
    public String geoCodeAddressInput(@HeaderParam("Referer") String referer, @QueryParam("query") String input) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        return geoCodeAddressInput(input);
    }

    @GET
    @Path("/reverse-geocode/{latlng}")
    public String geoCodeLocationInput(@HeaderParam("Referer") String referer, @PathParam("latlng") String latlng) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        return geoCodeLocationInput(latlng);
    }

    // --- Utility Resources (Geo Coding and Reverse Geo Coding)

    private String geoCodeAddressInput(String addressValue) {
        String query = addressValue;
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

    /**
     * Returns name for the given coordinate pair by (unauthenticated) asking Google Geocode API.
     * @param inputValue    String containing an URL encoded latitude longitude value pair.
     * @return
     */
    private String geoCodeLocationInput(String inputValue) {
        String result = "";
        try {
            String url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + inputValue + "&language=de";
            // &result_type=street_address|postal_code&key=API_KEY
            URLConnection connection = new URL(url).openConnection();
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Charset", "UTF-8");
            // Get the response
            BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = rd.readLine()) != null) {
                sb.append(line);
            }
            rd.close();
            result = sb.toString();
            log.info("Reverse Geo Coded Location ("+inputValue+") successfully.");
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
        return result;
    }

    // ------------------------------------------------------------------------------------------------- Private Methods

    private boolean isAuthenticated() {
        return (acService.getUsername() != null);
    }

    private Topic getParentGeoObjectTopic(Topic entry) {
        return entry.getRelatedTopic(null, "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
    }

    private Topic getRelatedBezirk(Topic geoObject) {
        return geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", "ka2.bezirk");
    }

    private boolean hasRelatedBezirk(Topic geoObject, long bezirksId) {
        Topic relatedBezirk = getRelatedBezirk(geoObject);
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
            // Sets Street, Postal Code, City and Address
            Topic addressTopic = einrichtung.getChildTopics().getTopic(KiezatlasService.GEO_OBJECT_ADDRESS);
            infoModel.setAddress(addressTopic);
            // Sets Latitude and Longitude
            GeoCoordinate geoCoordinate = geomapsService.getGeoCoordinate(addressTopic);
            infoModel.setCoordinates(geoCoordinate);
            // Sets Kontakt Facet
            Topic kontakt = facetsService.getFacet(einrichtung, KONTAKT_FACET);
            if (kontakt != null) {
                kontakt.loadChildTopics();
                infoModel.setEmail(kontakt.getChildTopics().getString(KONTAKT_MAIL));
                infoModel.setFax(kontakt.getChildTopics().getString(KONTAKT_FAX));
                infoModel.setTelefon(kontakt.getChildTopics().getString(KONTAKT_TEL));
                infoModel.setAnsprechpartner(kontakt.getChildTopics().getString(KONTAKT_ANSPRECHPARTNER));
            }
            // Calculates Imprint Value
            Topic bezirk = getRelatedBezirk(einrichtung);
            BezirkInfo bezirkInfo = new BezirkInfo(bezirk);
            if (bezirkInfo.getImprintLink() != null) {
                infoModel.setImprintUrl(bezirkInfo.getImprintLink().getSimpleValue().toString());
            } else {
                log.warning("EinrichtungsInfos Bezirk has NO IMPRINT value set, ID:" + einrichtung.getId());
                infoModel.setImprintUrl("http://pax.spinnenwerk.de/~kiezatlas/index.php?id=6");
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

    private String parseFirstCoordinatePair(String jsonGoogleLocation) {
        String result = "";
        try {
            JSONObject response = new JSONObject(jsonGoogleLocation);
            JSONArray results = response.getJSONArray("results");
            // JSONObject geometry = results.();
            for (int i=0; i < results.length(); i++) {
                JSONObject obj = results.getJSONObject(i);
                // log.info("> Result: " + obj.toString());
                JSONObject geometry = obj.getJSONObject("geometry");
                JSONObject location = geometry.getJSONObject("location");
                log.info("Location: " + location.toString() + " Type: " + geometry.getString("location_type"));
                return location.getDouble("lng") + "," + location.getDouble("lat");
            }
        } catch (JSONException ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
        }
        return result;
    }

    private String parseFirstSublocality(String jsonGoogleLocation) {
        String result = "";
        try {
            JSONObject response = new JSONObject(jsonGoogleLocation);
            JSONArray results = response.getJSONArray("results");
            for (int i=0; i < results.length(); i++) {
                JSONObject obj = results.getJSONObject(i);
                JSONArray components = obj.getJSONArray("address_components");
                for (int k=0; k < components.length(); k++) {
                    JSONObject component = components.getJSONObject(k);
                    log.info("> Address Component: " + component.toString());
                    JSONArray types = component.getJSONArray("types");
                    for (int t=0; t < types.length(); t++) {
                        log.info("> Component Type: " + types.getString(i));
                        if (types.getString(i).equals("sublocality_level1")) {
                            if (component.has("long_name") && !component.getString("long_name").equals("undefined")) {
                                return component.getString("long_name");
                            } else {
                                return component.getString("short_name");
                            }
                        }
                    }
                }
            }
        } catch (JSONException ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
        }
        return result;
    }

}
