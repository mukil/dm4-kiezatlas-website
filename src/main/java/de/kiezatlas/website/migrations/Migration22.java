package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Migration;
import de.kiezatlas.KiezatlasService;
import java.util.List;
import java.util.logging.Logger;

/**
 *
 * @author malt
 */
public class Migration22 extends Migration {

    private final Logger log = Logger.getLogger(getClass().getName());

    @Override
    public void run() {
        List<Topic> beschreibungen = dm4.getTopicsByType("ka2.beschreibung");
        int descrRemoved = 0, hoursRemoved = 0;
        for (Topic beschreibung : beschreibungen) {
            Topic geoObject = getParentGeoObjectTopic(beschreibung);
            if (geoObject == null) {
                log.info("Removing orphaned Beschreibungstext \"" + beschreibung.getSimpleValue() + "\"");
                beschreibung.delete();
                descrRemoved++;
            }
        }
        List<Topic> openingHours = dm4.getTopicsByType("ka2.oeffnungszeiten");
        for (Topic openingHour : openingHours) {
            Topic geoObject = getParentGeoObjectTopic(openingHour);
            if (geoObject == null) {
                log.info("Removing orphaned Öffnungszeiten \"" + openingHour.getSimpleValue() + "\"");
                openingHour.delete();
                hoursRemoved++;
            }
        }
        log.info("Mogration 18 deleted " + descrRemoved + " orphaned Beschreibungen and " + hoursRemoved + " Öffnungszeiten topics");
    }

    private Topic getParentGeoObjectTopic(Topic entry) {
        Topic result = null;
        try {
            result = entry.getRelatedTopic(null, "dm4.core.child", "dm4.core.parent", KiezatlasService.GEO_OBJECT);
        } catch (RuntimeException ex) {
            log.warning("Exception loading parent geo object topic cause \"" + ex.getLocalizedMessage() + "\"");
            return result;
        }
        if (result == null) log.warning("Search Result Entry: " +entry.getTypeUri()
            + ", " +entry.getId() +" has no Geo Object as PARENT"); // fulltext searches also "abandoned" facet topics
        return result;
    }

}
