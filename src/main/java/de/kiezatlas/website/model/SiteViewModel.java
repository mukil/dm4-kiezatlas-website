package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.util.DeepaMehtaUtils;
import java.util.ArrayList;
import java.util.List;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import java.util.logging.Logger;

/**
 * A data-transfer object extending a <code>ka2.website</code> topic to be displayable.
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 */
public class SiteViewModel implements JSONEnabled {

    Logger log = Logger.getLogger(GeoDetailsViewModel.class.getName());

    private Topic topic;
    private JSONObject json = new JSONObject();

    public SiteViewModel(Topic site) {
        this.topic = site;
        this.topic.loadChildTopics();
    }

    public String getSitename() {
        return topic.getSimpleValue().toString();
    }

    public Topic getImprintLink() {
        return this.topic.getRelatedTopic("dm4.core.association", "dm4.core.default", "dm4.core.default",
            "dm4.webbrowser.web_resource");
    }

    public Topic getSiteLogoFile() {
        return this.topic.getRelatedTopic("dm4.core.association", "dm4.core.default", "dm4.core.default",
            "dm4.files.file");
    }

    public String getSiteInfoHTML() {
        return this.topic.getChildTopics().getStringOrNull("ka2.website.info_area");
    }

    public String getSiteWebAlias() {
        return this.topic.getChildTopics().getStringOrNull("ka2.website.web_alias");
    }

    public String getSiteRSSFeedURL() {
        return this.topic.getChildTopics().getStringOrNull("ka2.website.site_rss_feed_url");
    }

    public boolean getSiteMarkerclusterSetting() {
        boolean value = false;
        if (this.topic.getChildTopics().getBooleanOrNull("ka2.website.use_markercluster") != null) {
            value = this.topic.getChildTopics().getBoolean("ka2.website.use_markercluster");
        }
        return value;
    }

    public boolean getSiteSelectionSetting() {
        boolean value = false;
        if (this.topic.getChildTopics().getBooleanOrNull("ka2.website.auto_selection") != null) {
            value = this.topic.getChildTopics().getBoolean("ka2.website.auto_selection");
        }
        return value;
    }

    public Long getSiteCachingSetting() {
        Long value = new Long(-1);
        if (this.topic.getChildTopics().getLongOrNull("ka2.website.use_caching") != null) {
            value = this.topic.getChildTopics().getLong("ka2.website.use_caching");
        }
        return value;
    }

    public String getSiteIconStylesheet() {
        String value = "";
        if (this.topic.getChildTopics().getStringOrNull("ka2.website.icon_stylesheet") != null) {
            value = this.topic.getChildTopics().getString("ka2.website.icon_stylesheet");
        }
        return value;
    }

    public boolean getSiteLocationSearchSetting() {
        boolean value = false;
        if (this.topic.getChildTopics().getBooleanOrNull("ka2.website.use_location_search") != null) {
            value = this.topic.getChildTopics().getBoolean("ka2.website.use_location_search");
        }
        return value;
    }

    public boolean getSiteLocationPromptSetting() {
        boolean value = false;
        if (this.topic.getChildTopics().getBooleanOrNull("ka2.website.ask_for_location") != null) {
            value = this.topic.getChildTopics().getBoolean("ka2.website.ask_for_location");
        }
        return value;
    }

    public boolean getSiteFahrinfoLinkSetting() {
        boolean value = false;
        if (this.topic.getChildTopics().getBooleanOrNull("ka2.website.ask_for_location") != null) {
            value = this.topic.getChildTopics().getBoolean("ka2.website.ask_for_location");
        }
        return value;
    }

    public List<JSONObject> getRelatedSiteCriterias() {
        List<JSONObject> results = new ArrayList<JSONObject>();
        List<RelatedTopic> criterias = this.topic.getRelatedTopics("ka2.website.site_criteria");
        log.info("Site has " + criterias.size() + " related "+ criterias);
        for (Topic criteria : criterias) {
            results.add(criteria.toJSON());
        }
        return results; // DeepaMehtaUtils.toModelList(criterias) throws NPE in jsonEnabled.writeTo
    }

    public JSONObject toJSON() {
        try {
            Topic link = getImprintLink();
            String imprint = "http://www.kiezatlas.de/impressum";
            if (link != null) {
                imprint = link.getSimpleValue().toString();
            } else if (link == null) {
                log.warning("### Fallback because site \"" + this.topic.getSimpleValue() + "\" has no \"Web "
                    + "Resource\" associated (default, default) which we could use as an IMPRINT!");
            }
            String html = getSiteInfoHTML();
            String body = "<h3>Willkommen im Kiezatlas-Stadtpan " + getSitename() + "</h3>";
            if (html != null) {
                body = html;
            } else if (html == null) {
                log.warning("### Fallback because district \"" + this.topic.getSimpleValue() + "\" has no "
                    + "\"Bezirk Info Area\" associated (default, default) which we could use as content!");
            }
            Topic logo = getSiteLogoFile();
            if (logo != null) {
                this.json.put("logo", "/filerepo/" + logo.getChildTopics().getString("dm4.files.path"));
            }
            this.json.put("markercluster", getSiteMarkerclusterSetting());
            this.json.put("generated", getSiteSelectionSetting());
            this.json.put("cached", getSiteCachingSetting());
            this.json.put("iconstyle", getSiteIconStylesheet());
            this.json.put("locationSearch", getSiteLocationSearchSetting());
            this.json.put("locationPrompt", getSiteLocationPromptSetting());
            this.json.put("fahrinfoLink", getSiteFahrinfoLinkSetting());
            this.json.put("criterias", getRelatedSiteCriterias());
            this.json.put("newsfeed", getSiteRSSFeedURL());
            this.json.put("imprint", imprint);
            this.json.put("html", body);
            this.json.put("webAlias", getSiteWebAlias());
            this.json.put("value", getSitename());
            this.json.put("uri", this.topic.getUri());
            this.json.put("id", this.topic.getId());
            return this.json;
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a BezirkView FAILED");
        }
    }

}
