package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import java.util.logging.Logger;

/**
 * A data-transfer object extending a <code>ka2.website</code> topic to be displayable.
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 */
public class SiteInfo implements JSONEnabled {

    Logger log = Logger.getLogger(GeoObjectDetailsView.class.getName());

    private Topic topic;
    private JSONObject json = new JSONObject();

    public SiteInfo(Topic site) {
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
