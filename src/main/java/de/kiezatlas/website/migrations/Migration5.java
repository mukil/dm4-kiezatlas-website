package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.accesscontrol.SharingMode;
import de.deepamehta.plugins.workspaces.WorkspacesService;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_URI;
import java.util.logging.Logger;

/** 
 * Extends all existing Geo Objects about a "Confirmed" flag with the value "true".
 */
public class Migration5 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;

    @Override
    public void run() {
        Topic workspace = workspaceService.getWorkspace(CONFIRMATION_WS_URI);
        // workspace.getChildTopics().setRef("dm4.workspaces.sharing_mode", SharingMode.PUBLIC.getUri());
        // log.info("##### Make Kiezatlas Website \"Confirmation\"-Workspace PUBLIC AGAIN ########");
    }

}