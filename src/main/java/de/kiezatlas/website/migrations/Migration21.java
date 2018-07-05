package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasService;
import de.kiezatlas.website.WebsitePlugin;
import java.util.logging.Logger;

/**
 * Create VskA Kiezatlas Stadtteil und Gemeinwesenarbeit Stadtplan.
 * @author malted
 */
public class Migration20 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());


    @Inject private KiezatlasService kiezService;
    @Inject private WorkspacesService workspaces;

    @Override
    public void run() {
        Topic kiezatlasWorkspace = workspaces.getWorkspace(KiezatlasService.KIEZATLAS_WORKSPACE_URI);
        Topic vskaStadtplan = kiezService.createKiezatlasWebsite("VskA Kiezatlas Stadtteil- und Gemeinwesenarbeit", WebsitePlugin.VSKA_WEBSITE_URI);
        log.info("Creating new Website \"" + vskaStadtplan.getSimpleValue() + "\", assigned to \"Kiezatlas\" workspace");
        workspaces.assignToWorkspace(vskaStadtplan, kiezatlasWorkspace.getId());
        log.info("### Migration 20 COMPLETED: Created new VskA Stadtplan \"" + vskaStadtplan + "\" in Kiezatlas Workspace");
    }

}
