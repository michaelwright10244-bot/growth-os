import { useState } from "react";
import { AppContext } from "../types";
import {
  readResumeDocument,
  readResumePhoto,
  readResumeTemplate,
  ResumeDocument,
  ResumeEntry,
  ResumeTemplate,
  saveResumeDocument,
  saveResumePhoto,
  saveResumeTemplate,
} from "./storage";

const templates: Array<[ResumeTemplate, string]> = [
  ["classic", "原简历蓝"],
  ["clean", "清爽蓝"],
  ["warm", "暖灰版"],
];
type Group = "experience" | "projects" | "campus";

function Editable({
  value,
  editing,
  onChange,
}: {
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <span
      className="resume-editable"
      contentEditable={editing}
      suppressContentEditableWarning
      onBlur={(event) =>
        onChange(event.currentTarget.textContent?.trim() || "")
      }
    >
      {value}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="resume-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Entries({
  entries,
  editing,
  onEntry,
  onBullet,
}: {
  entries: ResumeEntry[];
  editing: boolean;
  onEntry: (
    index: number,
    field: "title" | "organization" | "period" | "location",
    value: string,
  ) => void;
  onBullet: (index: number, bullet: number, value: string) => void;
}) {
  return (
    <div className="resume-entry-list">
      {entries.map((entry, index) => (
        <article className="resume-entry" key={`${entry.title}-${index}`}>
          <header>
            <div>
              <h3>
                <Editable
                  value={entry.title}
                  editing={editing}
                  onChange={(value) => onEntry(index, "title", value)}
                />
              </h3>
              <p>
                <Editable
                  value={entry.organization}
                  editing={editing}
                  onChange={(value) => onEntry(index, "organization", value)}
                />
              </p>
            </div>
            <div className="resume-entry-meta">
              <Editable
                value={entry.period}
                editing={editing}
                onChange={(value) => onEntry(index, "period", value)}
              />
              {entry.location && (
                <Editable
                  value={entry.location}
                  editing={editing}
                  onChange={(value) => onEntry(index, "location", value)}
                />
              )}
            </div>
          </header>
          <ul>
            {entry.bullets.map((bullet, bulletIndex) => (
              <li
                key={bulletIndex}
                contentEditable={editing}
                suppressContentEditableWarning
                onBlur={(event) =>
                  onBullet(
                    index,
                    bulletIndex,
                    event.currentTarget.textContent?.trim() || "",
                  )
                }
              >
                {bullet}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function Resume({
  context,
}: {
  context: Pick<AppContext, "setNotice">;
}) {
  const { setNotice } = context;
  const [photo, setPhoto] = useState<string | null>(() => readResumePhoto());
  const [resume, setResume] = useState<ResumeDocument>(() =>
    readResumeDocument(),
  );
  const [template, setTemplate] = useState<ResumeTemplate>(() =>
    readResumeTemplate(),
  );
  const [editing, setEditing] = useState(false);
  const update = (next: ResumeDocument) => {
    saveResumeDocument(next);
    setResume(next);
  };
  const updateField = (
    field: keyof Pick<
      ResumeDocument,
      | "name"
      | "phone"
      | "email"
      | "address"
      | "birthday"
      | "school"
      | "educationPeriod"
      | "degree"
      | "major"
      | "courses"
    >,
    value: string,
  ) => update({ ...resume, [field]: value });
  const updateEntry = (
    group: Group,
    index: number,
    field: "title" | "organization" | "period" | "location",
    value: string,
  ) =>
    update({
      ...resume,
      [group]: resume[group].map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    });
  const updateBullet = (
    group: Group,
    index: number,
    bulletIndex: number,
    value: string,
  ) =>
    update({
      ...resume,
      [group]: resume[group].map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              bullets: entry.bullets.map((bullet, currentIndex) =>
                currentIndex === bulletIndex ? value : bullet,
              ),
            }
          : entry,
      ),
    });
  const updateList = (
    field: "awards" | "selfSummary",
    index: number,
    value: string,
  ) =>
    update({
      ...resume,
      [field]: resume[field].map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    });
  const uploadPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setNotice("请上传 2MB 以内的图片。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      saveResumePhoto(value);
      setPhoto(value);
    };
    reader.readAsDataURL(file);
  };
  const chooseTemplate = (value: ResumeTemplate) => {
    saveResumeTemplate(value);
    setTemplate(value);
  };

  return (
    <>
      <div className="section-title">
        <div>
          <h2>
            电子简历 <span className="resume-version">V 1.0</span>
          </h2>
          <p>内容保存在本机；开启编辑后直接修改文字。</p>
        </div>
        <div className="resume-actions">
          <button
            className="button outline"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "完成编辑" : "编辑内容"}
          </button>
          <details className="resume-menu">
            <summary aria-label="简历更多操作">•••</summary>
            <div>
              <button onClick={() => window.print()}>打印为 PDF</button>
              <span>选择颜色</span>
              {templates.map(([value, label]) => (
                <button
                  key={value}
                  className={template === value ? "active" : ""}
                  onClick={() => chooseTemplate(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>
      <article
        className={`resume resume-template template-${template} ${editing ? "resume-is-editing" : ""}`}
      >
        <header className="source-header">
          <div className="source-banner">
            <span aria-hidden="true">●</span>
            <h1>个人简历</h1>
          </div>
          <div className="source-profile">
            <dl>
              <div>
                <dt>姓　名</dt>
                <dd>
                  <Editable
                    value={resume.name}
                    editing={editing}
                    onChange={(value) => updateField("name", value)}
                  />
                </dd>
              </div>
              <div>
                <dt>电　话</dt>
                <dd>
                  <Editable
                    value={resume.phone}
                    editing={editing}
                    onChange={(value) => updateField("phone", value)}
                  />
                </dd>
              </div>
              <div>
                <dt>生　日</dt>
                <dd>
                  <Editable
                    value={resume.birthday}
                    editing={editing}
                    onChange={(value) => updateField("birthday", value)}
                  />
                </dd>
              </div>
              <div>
                <dt>邮　箱</dt>
                <dd>
                  <Editable
                    value={resume.email}
                    editing={editing}
                    onChange={(value) => updateField("email", value)}
                  />
                </dd>
              </div>
              <div className="source-address">
                <dt>所在地</dt>
                <dd>
                  <Editable
                    value={resume.address}
                    editing={editing}
                    onChange={(value) => updateField("address", value)}
                  />
                </dd>
              </div>
            </dl>
            <label className="resume-photo" title="上传头像">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => uploadPhoto(event.target.files?.[0])}
              />
              {photo ? (
                <img src={photo} alt={`${resume.name}的头像`} />
              ) : (
                <span>
                  点击上传
                  <br />
                  个人照片
                </span>
              )}
            </label>
          </div>
        </header>
        <main className="source-body">
          <Section title="工作经历">
            <Entries
              entries={resume.experience}
              editing={editing}
              onEntry={(index, field, value) =>
                updateEntry("experience", index, field, value)
              }
              onBullet={(index, bullet, value) =>
                updateBullet("experience", index, bullet, value)
              }
            />
          </Section>
          <Section title="项目经历">
            <Entries
              entries={resume.projects}
              editing={editing}
              onEntry={(index, field, value) =>
                updateEntry("projects", index, field, value)
              }
              onBullet={(index, bullet, value) =>
                updateBullet("projects", index, bullet, value)
              }
            />
          </Section>
          <Section title="教育背景">
            <div className="education">
              <div>
                <h3>
                  <Editable
                    value={resume.school}
                    editing={editing}
                    onChange={(value) => updateField("school", value)}
                  />
                </h3>
                <p>
                  <Editable
                    value={resume.degree}
                    editing={editing}
                    onChange={(value) => updateField("degree", value)}
                  />
                </p>
              </div>
              <div>
                <small>
                  <Editable
                    value={resume.educationPeriod}
                    editing={editing}
                    onChange={(value) => updateField("educationPeriod", value)}
                  />
                </small>
                <p>
                  <Editable
                    value={resume.major}
                    editing={editing}
                    onChange={(value) => updateField("major", value)}
                  />
                </p>
              </div>
            </div>
            <p className="resume-courses">
              <b>主修课程：</b>
              <Editable
                value={resume.courses}
                editing={editing}
                onChange={(value) => updateField("courses", value)}
              />
            </p>
          </Section>
          <Section title="证书及技能">
            <ul className="resume-awards">
              {resume.awards.map((award, index) => (
                <li
                  key={index}
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onBlur={(event) =>
                    updateList(
                      "awards",
                      index,
                      event.currentTarget.textContent?.trim() || "",
                    )
                  }
                >
                  {award}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="校园经历">
            <Entries
              entries={resume.campus}
              editing={editing}
              onEntry={(index, field, value) =>
                updateEntry("campus", index, field, value)
              }
              onBullet={(index, bullet, value) =>
                updateBullet("campus", index, bullet, value)
              }
            />
          </Section>
          <Section title="自我总结">
            <ul className="resume-self-summary">
              {resume.selfSummary.map((item, index) => (
                <li
                  key={index}
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onBlur={(event) =>
                    updateList(
                      "selfSummary",
                      index,
                      event.currentTarget.textContent?.trim() || "",
                    )
                  }
                >
                  {item}
                </li>
              ))}
            </ul>
          </Section>
        </main>
      </article>
    </>
  );
}
